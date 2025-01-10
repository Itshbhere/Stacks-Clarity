import {
  standardPrincipalCV,
  uintCV,
  someCV,
  noneCV,
  bufferCVFromString,
  getAddressFromPrivateKey,
  makeContractCall,
  validateStacksAddress,
  broadcastTransaction,
  fetchCallReadOnlyFunction,
} from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";
import readline from "readline";

// Configuration
const SENDER_KEY =
  "f7984d5da5f2898dc001631453724f7fd44edaabdaa926d7df29e6ae3566492c01";
const CONTRACT_ADDRESS = "ST1X8ZTAN1JBX148PNJY4D1BPZ1QKCKV3H3CK5ACA";
const CONTRACT_NAME = "Krypto";
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

// Get token balance with improved error handling
async function getTokenBalance(address) {
  try {
    console.log(`Fetching balance for address: ${address}`);

    const result1 = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "get-balance",
      functionArgs: [standardPrincipalCV(address)],
      network: STACKS_TESTNET,
      senderAddress: address,
    };

    const result = await fetchCallReadOnlyFunction(result1);

    if (!result) {
      throw new Error("No response received from balance check");
    }

    console.log("Balance check response:", result);
    const firstbalnce = result.value;
    console.log("First balance", firstbalnce.value);
    // Extract the balance value from the response
    const balance = firstbalnce.value;
    return balance;
  } catch (error) {
    console.error("Error getting balance:", error);
    // Return 0 as default balance in case of error
    return 0n;
  }
}

// Main transfer function
async function transferTokens(recipientAddress, amount) {
  try {
    const senderAddress = getAddressFromPrivateKey(SENDER_KEY, STACKS_TESTNET);
    console.log("\nSender's address:", senderAddress);

    // Get initial balances
    console.log("\nFetching initial balances...");
    const initialSenderBalance = await getTokenBalance(senderAddress);
    const initialRecipientBalance = await getTokenBalance(recipientAddress);

    console.log(`Sender's initial balance: ${initialSenderBalance}`);
    console.log(`Recipient's initial balance: ${initialRecipientBalance}`);

    // Validate sender has enough balance
    if (initialSenderBalance < BigInt(amount)) {
      throw new Error("Insufficient balance for transfer");
    }

    const functionArgs = [
      uintCV(parseInt(amount)),
      standardPrincipalCV(senderAddress),
      standardPrincipalCV(recipientAddress),
      noneCV(), // No memo
    ];

    const txOptions = {
      senderKey: SENDER_KEY,
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "transfer",
      functionArgs,
      validateWithAbi: true,
      network,
      anchorMode: 3,
      postConditionMode: 1,
      fee: 2000n,
    };

    console.log("\nCreating transaction...");
    const transaction = await makeContractCall(txOptions);

    console.log("Broadcasting transaction...");
    const broadcastResponse = await broadcastTransaction({
      transaction,
      network,
    });

    if (broadcastResponse.error) {
      throw new Error(broadcastResponse.error);
    }

    console.log("\nTransaction successful!");
    console.log("Transaction ID:", broadcastResponse.txid);
    console.log(
      `View in Explorer: https://explorer.stacks.co/txid/${broadcastResponse.txid}?chain=testnet`
    );

    // Wait for a few seconds to allow the transaction to be processed
    console.log("\nWaiting for transaction to be processed...");
    await new Promise((resolve) => setTimeout(resolve, 15000));

    // Get final balances
    console.log("\nVerifying transfer...");
    const finalSenderBalance = await getTokenBalance(senderAddress);
    const finalRecipientBalance = await getTokenBalance(recipientAddress);

    console.log("\nTransfer verification:");
    console.log(`Sender's final balance: ${finalSenderBalance}`);
    console.log(`Recipient's final balance: ${finalRecipientBalance}`);
    console.log(`Amount transferred: ${amount}`);

    // Verify the transfer
    const senderBalanceChange = initialSenderBalance - finalSenderBalance;
    const recipientBalanceChange =
      finalRecipientBalance - initialRecipientBalance;

    if (
      senderBalanceChange === BigInt(amount) &&
      recipientBalanceChange === BigInt(amount)
    ) {
      console.log("\nTransfer verified successfully!");
    } else {
      console.log(
        "\nWarning: Balance changes don't match the transfer amount exactly."
      );
      console.log("This might be due to transaction timing or network delays.");
    }

    return broadcastResponse.txid;
  } catch (error) {
    throw error;
  }
}

// Main execution
async function main() {
  try {
    console.log("=== Stacks Token Transfer Script (Testnet) ===\n");

    const recipientAddress = await question("Enter recipient address: ");
    const { isValid, error } = validateRecipientAddress(recipientAddress);
    if (!isValid) {
      throw new Error(error);
    }

    const amount = await question("Enter amount to transfer: ");
    if (!validateAmount(amount)) {
      throw new Error("Amount must be a positive integer");
    }

    await transferTokens(recipientAddress, amount);
  } catch (error) {
    console.error("\nError:", error.message);
  } finally {
    rl.close();
  }
}

// Run the script
main();
