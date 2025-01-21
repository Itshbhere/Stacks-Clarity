import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  uintCV,
  getAddressFromPrivateKey,
} from "@stacks/transactions";
import { STACKS_MAINNET } from "@stacks/network";
import dotenv from "dotenv";

dotenv.config();

const CONTRACT_ADDRESS =
  process.env.CONTRACT_ADDRESS || "SPXWGJQ101N1C1FYHK64TGTHN4793CHVKTJAT7VQ";
const CONTRACT_NAME = "dex";
const NETWORK = STACKS_MAINNET;

async function executeSwap(privateKey, stxAmount) {
  try {
    const senderAddress = getAddressFromPrivateKey(privateKey, STACKS_MAINNET);
    console.log("Sender address:", senderAddress);

    // Create post condition using the new format
    const postConditions = [
      {
        type: "stx-postcondition",
        address: senderAddress,
        condition: "le",
        amount: stxAmount.toString(),
      },
    ];

    console.log("Preparing transaction...", postConditions);

    const txOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "swap",
      functionArgs: [uintCV(stxAmount)],
      senderKey: privateKey,
      validateWithAbi: true,
      network: NETWORK,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
      postConditions,
    };

    console.log("Transaction options:", txOptions);

    console.log("Preparing transaction...");
    const transaction = await makeContractCall(txOptions);

    console.log("Broadcasting transaction...");
    const broadcastResponse = await broadcastTransaction(transaction, NETWORK);

    console.log("Transaction broadcast successfully!");
    console.log("Transaction ID:", broadcastResponse.txid);
    console.log(
      `View transaction: https://explorer.stacks.co/txid/${broadcastResponse.txid}`
    );

    return broadcastResponse.txid;
  } catch (error) {
    console.error("Swap failed:", error);
    throw error;
  }
}

// Script execution
async function main() {
  const privateKey =
    "f7984d5da5f2898dc001631453724f7fd44edaabdaa926d7df29e6ae3566492c01";
  const stxAmount = 10; // Amount in microSTX

  if (!privateKey) {
    console.error("Error: STX_PRIVATE_KEY environment variable is required");
    process.exit(1);
  }

  try {
    console.log(`Initiating swap of ${stxAmount} microSTX`);
    const txId = await executeSwap(privateKey, stxAmount);
    console.log("Swap initiated successfully");
  } catch (error) {
    console.error("Failed to execute swap:", error.message);
    process.exit(1);
  }
}

main();
