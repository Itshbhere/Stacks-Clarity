import {
  makeSTXTokenTransfer,
  broadcastTransaction,
  getAddressFromPrivateKey,
  validateStacksAddress,
  fetchNonce,
} from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";
import readline from "readline";

// Configuration
const SENDER_KEY =
  "f7984d5da5f2898dc001631453724f7fd44edaabdaa926d7df29e6ae3566492c01";
const network = STACKS_TESTNET;

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promise wrapper for readline
const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

// Validate recipient address
const validateRecipientAddress = (address) => {
  try {
    if (!address || !address.startsWith("ST")) {
      return {
        isValid: false,
        error: "Invalid address format. Must start with 'ST' for testnet",
      };
    }

    const isValid = validateStacksAddress(address);
    if (!isValid) {
      return { isValid: false, error: "Invalid Stacks address format" };
    }

    return { isValid: true, error: null };
  } catch (err) {
    return { isValid: false, error: "Invalid address format" };
  }
};

// Validate amount
const validateAmount = (amount) => {
  const numAmount = Number(amount);
  return numAmount > 0 && Number.isInteger(numAmount);
};

// Get account nonce
async function getAccountNonce(address) {
  try {
    const account = 1000;
    return account;
  } catch (error) {
    console.error("Error fetching nonce:", error);
    throw new Error("Failed to fetch account nonce");
  }
}

// Check STX balance
async function checkSTXBalance(address) {
  try {
    const response = await fetch(
      `https://api.testnet.hiro.so/extended/v1/address/${address}/balances`
    );
    const data = await response.json();
    return BigInt(data.stx.balance);
  } catch (error) {
    console.error("Error fetching balance:", error);
    throw new Error("Failed to fetch STX balance");
  }
}

// Main transfer function
async function transferSTX(recipientAddress, amount) {
  try {
    const senderAddress = getAddressFromPrivateKey(SENDER_KEY, network);
    console.log("\nSender's address:", senderAddress);

    // Check sender's balance
    const balance = await checkSTXBalance(senderAddress);
    console.log(`Current balance: ${balance} microSTX`);

    if (balance < BigInt(amount) + BigInt(2000)) {
      // amount + minimum fee
      throw new Error(
        `Insufficient balance. You need at least ${
          amount + 2000
        } microSTX (including fee)`
      );
    }
    console.log(senderAddress);

    // Get the current nonce
    const nonce = await fetchNonce({
      senderAddress,
      network: STACKS_TESTNET,
    });
    console.log(`Current nonce: ${nonce}`);

    const txOptions = {
      recipient: recipientAddress,
      amount: BigInt(amount),
      senderKey: SENDER_KEY,
      network,
      memo: "STX Transfer",
      nonce: nonce,
      fee: 2000n,
      anchorMode: 1, // Changed to 1 (OnChainOnly) for simpler confirmation
    };

    console.log("\nCreating transaction with options:", txOptions);
    const transaction = await makeSTXTokenTransfer(txOptions);

    console.log("Broadcasting transaction...");
    const broadcastResponse = await broadcastTransaction({
      transaction,
      network,
    });

    if (broadcastResponse.error) {
      throw new Error(`Broadcast error: ${broadcastResponse.error}`);
    }

    console.log("\nTransaction successful!");
    console.log("Transaction ID:", broadcastResponse.txid);
    console.log(
      `View in Explorer: https://explorer.stacks.co/txid/${broadcastResponse.txid}?chain=testnet`
    );

    return broadcastResponse.txid;
  } catch (error) {
    throw error;
  }
}

// Main execution
async function main() {
  try {
    console.log("=== Native STX Transfer Script (Testnet) ===\n");
    console.log(
      "Note: Amount should be in microSTX (1 STX = 1,000,000 microSTX)\n"
    );

    const recipientAddress = await question("Enter recipient address: ");
    const { isValid, error } = validateRecipientAddress(recipientAddress);
    if (!isValid) {
      throw new Error(error);
    }

    const amount = await question("Enter amount to transfer (in microSTX): ");
    if (!validateAmount(amount)) {
      throw new Error("Amount must be a positive integer");
    }

    await transferSTX(recipientAddress, amount);
  } catch (error) {
    console.error("\nError:", error.message);
  } finally {
    rl.close();
  }
}

// Run the script
main();
