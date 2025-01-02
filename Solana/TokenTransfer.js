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
} from "@stacks/transactions";
import { STACKS_MAINNET } from "@stacks/network";

// Configuration - Replace these values with your own
const SENDER_KEY =
  "f7984d5da5f2898dc001631453724f7fd44edaabdaa926d7df29e6ae3566492c01";
const CONTRACT_ADDRESS = "SP1X8ZTAN1JBX148PNJY4D1BPZ1QKCKV3H2SAZ7CN";
const CONTRACT_NAME = "Krypto";
const network = STACKS_MAINNET;
const memo = "Hello World";

async function transferTokens(recipientAddress, amount) {
  try {
    // Validate inputs
    if (!recipientAddress.startsWith("SP")) {
      throw new Error("Invalid recipient address");
    }

    if (!Number.isInteger(Number(amount)) || Number(amount) <= 0) {
      throw new Error("Amount must be a positive integer");
    }

    const senderAddress = "SP1X8ZTAN1JBX148PNJY4D1BPZ1QKCKV3H2SAZ7CN";
    // Prepare function arguments
    const functionArgs = [
      uintCV(parseInt(amount)),
      standardPrincipalCV(senderAddress),
      standardPrincipalCV(recipient),
      memo ? someCV(bufferCVFromString(memo)) : noneCV(),
    ];
    console.log("1");
    // Create transaction options
    const txOptions = {
      senderKey: SENDER_KEY,
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "transfer",
      functionArgs,
      network,
      anchorMode: 3,
      postConditionMode: 1,
      fee: 2000n,
    };

    // Create and sign transaction
    console.log("Creating transaction...");
    const transaction = await makeContractCall(txOptions);
    console.log(transaction);

    // Broadcast transaction
    console.log("Broadcasting transaction...");
    const broadcastResponse = await broadcastTransaction({
      transaction,
      network: STACKS_MAINNET,
    });

    console.log("3");

    if (broadcastResponse.error) {
      throw new Error(broadcastResponse.error);
    }

    console.log("Transaction successful!");
    console.log("Transaction ID:", broadcastResponse.txid);
    console.log(
      "View in explorer:",
      `https://explorer.stacks.co/txid/${broadcastResponse.txid}?chain=testnet`
    );

    return broadcastResponse.txid;
  } catch (error) {
    console.error("Transfer failed:", error.message);
    throw error;
  }
}

// Example usage
const recipient = "SP33Y26J2EZW5SJSDRKFJVE97P40ZYYR7K2BXF5Q0"; // Example address
const amount = 1;

transferTokens(recipient, amount)
  .then((txId) => console.log("Transfer completed with transaction ID:", txId))
  .catch((error) => console.error("Transfer failed:", error.message));
