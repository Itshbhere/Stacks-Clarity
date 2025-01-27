const { StacksMainnet, StacksTestnet } = require("@stacks/network");
const {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  FungibleConditionCode,
} = require("@stacks/transactions");
const { standardPrincipalCV, uintCV } = require("@stacks/transactions");
require("dotenv").config();

class STXTransfer {
  constructor(network = "mainnet") {
    this.network =
      network === "mainnet" ? new StacksMainnet() : new StacksTestnet();
  }

  async sendSTX(recipientAddress, amount, senderKey) {
    try {
      if (!senderKey) {
        throw new Error("Sender private key is required");
      }

      const txOptions = {
        recipient: recipientAddress,
        amount: amount * 1000000, // Convert to microSTX
        senderKey: senderKey,
        network: this.network,
        anchorMode: AnchorMode.Any,
        fee: 10000, // Set appropriate fee
        nonce: 0, // You might want to fetch this dynamically
      };

      const transaction = await makeSTXTokenTransfer(txOptions);
      const broadcastResponse = await broadcastTransaction(
        transaction,
        this.network
      );

      return {
        success: true,
        txId: broadcastResponse.txid,
        message: `Successfully initiated transfer of ${amount} STX to ${recipientAddress}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to transfer STX: ${error.message}`,
      };
    }
  }

  async checkTransactionStatus(txId) {
    try {
      const response = await fetch(
        `${this.network.coreApiUrl}/extended/v1/tx/${txId}`
      );
      const txInfo = await response.json();

      return {
        success: true,
        status: txInfo.tx_status,
        confirmations: txInfo.confirmations,
        timestamp: txInfo.burn_block_time,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to check transaction status: ${error.message}`,
      };
    }
  }
}

// Example usage
const transferSTX = async () => {
  // Load environment variables
  const SENDER_KEY = process.env.SENDER_PRIVATE_KEY;
  const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS;
  const AMOUNT = 10; // Amount in STX

  const stxTransfer = new STXTransfer("testnet"); // Use 'testnet' or 'mainnet'

  // Perform transfer
  const transferResult = await stxTransfer.sendSTX(
    RECIPIENT_ADDRESS,
    AMOUNT,
    SENDER_KEY
  );

  if (transferResult.success) {
    console.log(`Transfer initiated: ${transferResult.txId}`);

    // Check transaction status after a few seconds
    setTimeout(async () => {
      const status = await stxTransfer.checkTransactionStatus(
        transferResult.txId
      );
      console.log("Transaction status:", status);
    }, 5000);
  } else {
    console.error("Transfer failed:", transferResult.message);
  }
};

module.exports = STXTransfer;
