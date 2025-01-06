import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createTransferInstruction } from "@solana/spl-token";
import fs from "fs";
import fetch from "node-fetch";

const secretKeyString = fs.readFileSync("./Keypair.json", "utf8");
const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
const payer = Keypair.fromSecretKey(secretKey);

class ReverseTokenBridge {
  constructor(config) {
    this.stacksContractAddress = config.stacksContractAddress;
    this.stacksContractName = config.stacksContractName;
    this.stacksReceiverAddress = config.stacksReceiverAddress;
    this.solanaPrivateKey = config.solanaPrivateKey;
    this.solanaMintAddress = config.solanaMintAddress;
    this.solanaReceiverAddress = config.solanaReceiverAddress;
    this.processedTxs = new Set();
    this.lastProcessedTimestamp = 0;
    this.storageFile = "processed_transactions.json";
    this.pollingInterval = 10000; // 10 seconds
  }

  async loadProcessedTransactions() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const data = JSON.parse(fs.readFileSync(this.storageFile, "utf8"));
        this.processedTxs = new Set(data.processedTxs);
        this.lastProcessedTimestamp = data.lastProcessedTimestamp || 0;
        console.log(`Loaded ${this.processedTxs.size} processed transactions`);
        console.log(
          `Last processed timestamp: ${new Date(
            this.lastProcessedTimestamp
          ).toISOString()}`
        );
      }
    } catch (error) {
      console.error("Error loading processed transactions:", error);
      // Initialize with empty state if file cannot be read
      this.processedTxs = new Set();
      this.lastProcessedTimestamp = 0;
    }
  }

  saveProcessedTransactions() {
    try {
      const data = {
        processedTxs: Array.from(this.processedTxs),
        lastProcessedTimestamp: this.lastProcessedTimestamp,
      };
      fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2));
      console.log("Saved processed transactions to disk");
    } catch (error) {
      console.error("Error saving processed transactions:", error);
    }
  }

  async fetchRecentTransactions() {
    try {
      // Stacks API endpoint for mainnet
      const apiUrl = "https://api.mainnet.hiro.so";
      const limit = 50; // Number of transactions to fetch

      // Construct the API endpoint URL
      const url = `${apiUrl}/extended/v1/address/${this.stacksContractAddress}/transactions?limit=${limit}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Filter transactions to only include those interacting with our contract
      return data.results.filter((tx) => {
        // Check if it's a contract call
        if (!tx.tx_type || tx.tx_type !== "contract_call") {
          return false;
        }

        // Verify it's calling our specific contract
        if (
          tx.contract_call &&
          tx.contract_call.contract_id ===
            `${this.stacksContractAddress}.${this.stacksContractName}`
        ) {
          return true;
        }

        return false;
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  }

  async initialize() {
    try {
      await this.loadProcessedTransactions();

      // Initialize Solana connection
      this.solanaConnection = new Connection("https://api.devnet.solana.com", {
        commitment: "confirmed",
      });

      // Initialize Solana token accounts
      this.senderTokenAccount = await this.findAssociatedTokenAccount(
        new PublicKey(this.solanaPrivateKey.publicKey),
        new PublicKey(this.solanaMintAddress)
      );

      this.receiverTokenAccount = await this.findAssociatedTokenAccount(
        new PublicKey(this.solanaReceiverAddress),
        new PublicKey(this.solanaMintAddress)
      );

      console.log("Reverse Bridge Initialized");
      console.log("Monitoring Stacks address:", this.stacksReceiverAddress);
      console.log("Solana receiver:", this.solanaReceiverAddress);

      // Start polling
      this.startPolling();
    } catch (error) {
      console.error("Initialization error:", error);
      throw error;
    }
  }

  async findAssociatedTokenAccount(owner, mint) {
    const [address] = await PublicKey.findProgramAddress(
      [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      TOKEN_PROGRAM_ID
    );
    return address;
  }

  async startPolling() {
    console.log("Starting to poll for transactions...");
    this.pollTransactions();
  }

  async pollTransactions() {
    try {
      const transactions = await this.fetchRecentTransactions();
      console.log(`\nProcessing ${transactions.length} transactions`);

      // Sort transactions by timestamp in ascending order
      const sortedTransactions = transactions.sort(
        (a, b) =>
          new Date(a.burn_block_time_iso) - new Date(b.burn_block_time_iso)
      );

      for (const tx of sortedTransactions) {
        const txTimestamp = new Date(tx.burn_block_time_iso).getTime();

        console.log(`\nChecking transaction ${tx.tx_id}`);
        console.log(
          `Transaction timestamp: ${new Date(txTimestamp).toISOString()}`
        );
        console.log(
          `Last processed timestamp: ${new Date(
            this.lastProcessedTimestamp
          ).toISOString()}`
        );

        // Only process transactions that are newer than our last processed timestamp
        if (
          txTimestamp > this.lastProcessedTimestamp &&
          !this.processedTxs.has(tx.tx_id)
        ) {
          console.log("New transaction found:", tx.tx_id);

          if (this.isRelevantTransfer(tx)) {
            try {
              const transferDetails = this.extractTransferDetails(tx);

              console.log("\n=== New Token Transfer Detected ===");
              console.log(`Transaction ID: ${tx.tx_id}`);
              console.log(`From: ${transferDetails.sender}`);
              console.log(`To: ${transferDetails.recipient}`);
              console.log(
                `Amount: ${transferDetails.amount.toString()} tokens`
              );
              console.log("=====================================");

              await this.processTransaction(tx.tx_id);

              // Update the last processed timestamp
              this.lastProcessedTimestamp = txTimestamp;
              this.saveProcessedTransactions();
            } catch (error) {
              console.error(
                `Error processing transaction ${tx.tx_id}:`,
                error.message
              );
              console.debug("Full error:", error);
              console.debug(
                "Transaction data:",
                JSON.stringify(tx.contract_call.function_args, null, 2)
              );
            }
          }
        } else {
          console.log("Transaction already processed or too old:", tx.tx_id);
        }
      }
    } catch (error) {
      console.error("Error polling transactions:", error);
    } finally {
      setTimeout(() => this.pollTransactions(), this.pollingInterval);
    }
  }

  // ... [rest of the class methods remain the same]
}

// Example usage
const reverseBridge = new ReverseTokenBridge({
  stacksContractAddress: "ST1X8ZTAN1JBX148PNJY4D1BPZ1QCKV3H3CK5ACA",
  stacksContractName: "Krypto",
  stacksReceiverAddress: "ST33Y26J2EZW5SJSDRKFJVE97P40ZYYR7K3PATCNF",
  solanaPrivateKey: payer,
  solanaMintAddress: "6TpnnQFFjbyruU4q96x1mygUUynQ9uRxSAWymuAK9FYz",
  solanaReceiverAddress: "Cfez4iZDiEvATzbyBKiN1KDaPoBkyn82yuTpCZtpgtG4",
});

reverseBridge
  .initialize()
  .then(() => console.log("Reverse bridge started successfully"))
  .catch((error) => {
    console.error("Failed to start reverse bridge:", error);
    process.exit(1);
  });
