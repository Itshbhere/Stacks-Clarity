import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  uintCV,
  createStacksPrivateKey,
  getAddressFromPrivateKey,
  //   TransactionVersion,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
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
    // Create private key instance
    const privateKeyInstance = createStacksPrivateKey(privateKey);

    // Get the sender address from private key
    const senderAddress = getAddressFromPrivateKey(
      privateKey,
      STACKS_MAINNET // or TransactionVersion.Testnet for testnet
    );

    // Add post condition to protect the user
    const postConditions = [
      makeStandardSTXPostCondition(
        senderAddress,
        FungibleConditionCode.LessEqual,
        stxAmount
      ),
    ];

    const txOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "swap",
      functionArgs: [uintCV(stxAmount)],
      senderAddress,
      senderKey: privateKey,
      validateWithAbi: true,
      network: NETWORK,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
      postConditions,
    };

    console.log("Preparing transaction...");
    const transaction = await makeContractCall(txOptions);

    console.log("Broadcasting transaction...");
    const broadcastResponse = await broadcastTransaction({
      transaction,
      network: NETWORK,
    });

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
  const privateKey = process.env.STX_PRIVATE_KEY;
  const stxAmount = process.env.STX_AMOUNT
    ? parseInt(process.env.STX_AMOUNT)
    : 1000000; // Default 1 STX

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
