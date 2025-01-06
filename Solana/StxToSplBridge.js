import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createTransferInstruction } from "@solana/spl-token";
import fs from "fs";

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
    this.lastChecked = null;
    this.pollingInterval = 10000; // 10 seconds
  }

  async initialize() {
    try {
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

      for (const tx of transactions) {
        if (!this.processedTxs.has(tx.tx_id)) {
          console.log("Processing new transaction:", tx.tx_id);
          await this.processTransaction(tx.tx_id);
        }
      }
    } catch (error) {
      console.error("Error polling transactions:", error);
    } finally {
      // Schedule next poll
      setTimeout(() => this.pollTransactions(), this.pollingInterval);
    }
  }

  async fetchRecentTransactions() {
    const limit = 50;
    const url = `https://stacks-node-api.testnet.stacks.co/extended/v1/address/${this.stacksReceiverAddress}/transactions?limit=${limit}&unanchored=true`;

    try {
      console.log("\n--- Fetching Transactions ---");
      console.log("API URL:", url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Fetched ${data.results.length} transactions`);

      // Log each transaction
      data.results.forEach((tx) => {
        console.log("\nTransaction:", {
          tx_id: tx.tx_id,
          tx_type: tx.tx_type,
          tx_status: tx.tx_status,
          contract_call: tx.contract_call
            ? {
                contract_id: tx.contract_call.contract_id,
                function_name: tx.contract_call.function_name,
              }
            : "No contract call",
        });
      });

      return data.results;
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  }

  isRelevantTransfer(txInfo) {
    console.log("\n--- Checking Transaction Relevance ---");
    console.log("Transaction Info:", {
      tx_id: txInfo.tx_id,
      tx_type: txInfo.tx_type,
      contract_call: txInfo.contract_call,
    });

    // Add more detailed validation logging
    const validationResults = {
      hasContractCall: !!txInfo.contract_call,
      contractIdMatches:
        txInfo.contract_call?.contract_id ===
        `${this.stacksContractAddress}.${this.stacksContractName}`,
      functionNameMatches: txInfo.contract_call?.function_name === "transfer",
      expectedContractId: `${this.stacksContractAddress}.${this.stacksContractName}`,
      actualContractId: txInfo.contract_call?.contract_id,
      expectedFunction: "transfer",
      actualFunction: txInfo.contract_call?.function_name,
    };

    console.log("Validation Results:", validationResults);

    return (
      validationResults.hasContractCall &&
      validationResults.contractIdMatches &&
      validationResults.functionNameMatches
    );
  }

  async getTransactionInfo(txId) {
    const response = await fetch(
      `https://stacks-node-api.testnet.stacks.co/extended/v1/tx/${txId}`
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch transaction info: ${response.statusText}`
      );
    }
    return await response.json();
  }

  isRelevantTransfer(txInfo) {
    // Add more detailed validation logging
    const validationResults = {
      hasContractCall: !!txInfo.contract_call,
      contractIdMatches:
        txInfo.contract_call?.contract_id ===
        `${this.stacksContractAddress}.${this.stacksContractName}`,
      functionNameMatches: txInfo.contract_call?.function_name === "transfer",
      expectedContractId: `${this.stacksContractAddress}.${this.stacksContractName}`,
      actualContractId: txInfo.contract_call?.contract_id,
      expectedFunction: "transfer",
      actualFunction: txInfo.contract_call?.function_name,
    };

    console.log("Transfer validation results:", validationResults);

    return (
      validationResults.hasContractCall &&
      validationResults.contractIdMatches &&
      validationResults.functionNameMatches
    );
  }

  extractTransferAmount(txInfo) {
    const args = txInfo.contract_call.function_args;
    const amountArg = args.find((arg) => arg.name === "amount");
    if (!amountArg) {
      throw new Error("Amount argument not found in transaction");
    }
    return BigInt(amountArg.value);
  }

  extractRecipient(txInfo) {
    const args = txInfo.contract_call.function_args;
    const recipientArg = args.find((arg) => arg.name === "recipient");
    if (!recipientArg) {
      throw new Error("Recipient argument not found in transaction");
    }
    return recipientArg.value;
  }

  async processTransaction(txId) {
    if (this.processedTxs.has(txId)) {
      return;
    }

    try {
      console.log("Fetching transaction info for:", txId);
      const txInfo = await this.getTransactionInfo(txId);

      // Wait for transaction to be confirmed
      if (txInfo.tx_status !== "success") {
        console.log("Transaction not yet confirmed:", txId);
        return;
      }

      if (this.isRelevantTransfer(txInfo)) {
        console.log("Relevant transfer detected in transaction:", txId);
        const transferAmount = this.extractTransferAmount(txInfo);
        const recipient = this.extractRecipient(txInfo);

        console.log("Transfer details:", {
          amount: transferAmount.toString(),
          recipient,
          expectedRecipient: this.stacksReceiverAddress,
        });

        if (recipient === this.stacksReceiverAddress) {
          await this.processSolanaTransfer(transferAmount, txId);
        } else {
          console.log("Transfer recipient doesn't match monitoring address");
        }
      } else {
        console.log("Transaction is not a relevant transfer:", txId);
      }

      this.processedTxs.add(txId);
    } catch (error) {
      console.error("Error processing transaction:", error);
    }
  }

  async processSolanaTransfer(amount, stacksTxId) {
    console.log("\nProcessing Solana Transfer");
    console.log("Amount:", amount.toString());
    console.log("Recipient:", this.solanaReceiverAddress);
    console.log("Original Stacks TX:", stacksTxId);

    try {
      const transaction = new Transaction().add(
        createTransferInstruction(
          this.senderTokenAccount,
          this.receiverTokenAccount,
          this.solanaPrivateKey.publicKey,
          amount
        )
      );

      const signature = await sendAndConfirmTransaction(
        this.solanaConnection,
        transaction,
        [this.solanaPrivateKey]
      );

      console.log("Solana Transfer Complete");
      console.log("Signature:", signature);

      return signature;
    } catch (error) {
      console.error("Error executing Solana transfer:", error);
      throw error;
    }
  }
}

// Example usage
const reverseBridge = new ReverseTokenBridge({
  stacksContractAddress: "ST1X8ZTAN1JBX148PNJY4D1BPZ1QKCKV3H3CK5ACA",
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
