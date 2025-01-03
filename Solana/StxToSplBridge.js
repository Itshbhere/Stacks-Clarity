import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createTransferInstruction } from "@solana/spl-token";
import { STACKS_MAINNET } from "@stacks/network";
import { StacksApiSocketClient } from "@stacks/blockchain-api-client";
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
    this.network = STACKS_MAINNET;
    this.processedTxs = new Set();
  }

  async initialize() {
    try {
      // Initialize Solana connection
      this.solanaConnection = new Connection(
        "https://api.mainnet-beta.solana.com",
        {
          commitment: "confirmed",
        }
      );

      // Initialize Solana token accounts
      this.senderTokenAccount = await this.findAssociatedTokenAccount(
        new PublicKey(this.solanaPrivateKey.publicKey.toString()),
        new PublicKey(this.solanaMintAddress)
      );

      this.receiverTokenAccount = await this.findAssociatedTokenAccount(
        new PublicKey(this.solanaReceiverAddress),
        new PublicKey(this.solanaMintAddress)
      );

      console.log("Reverse Bridge Initialized");
      console.log("Monitoring Stacks address:", this.stacksReceiverAddress);
      console.log("Solana receiver:", this.solanaReceiverAddress);

      // Set up Stacks socket monitoring
      await this.setupStacksMonitor();
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

  async setupStacksMonitor() {
    try {
      const socketUrl = "https://api.mainnet.hiro.so";
      const socketClient = new StacksApiSocketClient({ url: socketUrl });

      console.log("Connecting to Stacks socket...");

      // Subscribe to new blocks
      socketClient.subscribeBlocks(async (block) => {
        console.log("New block received:", block);

        try {
          // Process the block for relevant transactions
          await this.processBlock(block);
        } catch (error) {
          console.error("Error processing block:", error);
        }
      });

      console.log("Stacks socket monitoring initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Stacks socket monitoring:", error);
    }
  }

  async processBlock(block) {
    for (const tx of block.transactions) {
      if (this.processedTxs.has(tx.tx_id)) continue;

      try {
        const txInfo = await this.getTransactionInfo(tx.tx_id);

        if (this.isRelevantTransfer(txInfo)) {
          const transferAmount = this.extractTransferAmount(txInfo);
          const recipient = this.extractRecipient(txInfo);

          if (recipient === this.stacksReceiverAddress) {
            await this.processSolanaTransfer(transferAmount, tx.tx_id);
          }
        }

        this.processedTxs.add(tx.tx_id);
      } catch (error) {
        console.error("Error processing transaction:", error);
      }
    }
  }

  async getTransactionInfo(txId) {
    const response = await fetch(
      `https://stacks-node-api.mainnet.stacks.co/extended/v1/tx/${txId}`
    );
    return await response.json();
  }

  isRelevantTransfer(txInfo) {
    return (
      txInfo.contract_call &&
      txInfo.contract_call.contract_id ===
        `${this.stacksContractAddress}.${this.stacksContractName}` &&
      txInfo.contract_call.function_name === "transfer"
    );
  }

  extractTransferAmount(txInfo) {
    const args = txInfo.contract_call.function_args;
    const amountArg = args.find((arg) => arg.name === "amount");
    return parseInt(amountArg.value);
  }

  extractRecipient(txInfo) {
    const args = txInfo.contract_call.function_args;
    const recipientArg = args.find((arg) => arg.name === "recipient");
    return recipientArg.value;
  }

  async processSolanaTransfer(amount, stacksTxId) {
    console.log("\nProcessing Solana Transfer");
    console.log("Amount:", amount);
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
  stacksContractAddress: "SP1X8ZTAN1JBX148PNJY4D1BPZ1QCKV3H2SAZ7CN",
  stacksContractName: "Krypto",
  stacksReceiverAddress: "SP33Y26J2EZW5SJSDRKFJVE97P40ZYYR7K2BXF5Q0",
  solanaPrivateKey: payer, // Generate this using @solana/web3.js
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
