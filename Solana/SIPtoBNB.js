import {
  standardPrincipalCV,
  uintCV,
  noneCV,
  getAddressFromPrivateKey,
  makeContractCall,
  fetchCallReadOnlyFunction,
  broadcastTransaction,
} from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";
import { ethers } from "ethers";
import fetch from "node-fetch";

// Only add this if running in Node.js environment
if (typeof global !== "undefined" && !global.fetch) {
  global.fetch = fetch;
}

// Configuration
const BNB_PRIVATE_KEY = "your-bnb-private-key";
const STACKS_PRIVATE_KEY = "your-stacks-private-key";
const RECIPIENT_STACKS_ADDRESS = "ST33Y26J2EZW5SJSDRKFJVE97P40ZYYR7K3PATCNF";
const RECIPIENT_BNB_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
const CONTRACT_ADDRESS = "ST1X8ZTAN1JBX148PNJY4D1BPZ1QCKV3H3CK5ACA";
const CONTRACT_NAME = "Krypto";
const RETRY_DELAY = 20000;
const MINIMUM_BNB_BALANCE = ethers.parseEther("0.01");

// Initialize providers and wallets
const provider = new ethers.JsonRpcProvider(
  "https://data-seed-prebsc-1-s1.binance.org:8545/"
);
const bnbWallet = new ethers.Wallet(BNB_PRIVATE_KEY, provider);
const network = STACKS_TESTNET;

// Check BNB balance
async function checkBnbBalance(walletAddress) {
  try {
    const balance = await provider.getBalance(walletAddress);
    const bnbBalance = ethers.formatEther(balance);
    console.log(`BNB balance for ${walletAddress}: ${bnbBalance} BNB`);
    return balance;
  } catch (error) {
    console.error("Error checking BNB balance:", error);
    throw error;
  }
}

// Transfer BNB
async function transferBNB(amount) {
  try {
    const amountWei = ethers.parseEther(amount.toString());
    const feeData = await provider.getFeeData();

    const tx = {
      to: RECIPIENT_BNB_ADDRESS,
      value: amountWei,
      gasPrice: feeData.gasPrice,
    };

    console.log(`Initiating BNB transfer of ${amount} BNB...`);

    const transaction = await bnbWallet.sendTransaction(tx);
    console.log("Waiting for transaction confirmation...");
    const receipt = await transaction.wait();

    return receipt.hash;
  } catch (error) {
    console.error("Error transferring BNB:", error);
    throw error;
  }
}

// Get Stacks balance
async function getStacksBalance(address) {
  try {
    console.log(`Fetching Stacks balance for address: ${address}`);
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "get-balance",
      functionArgs: [standardPrincipalCV(address)],
      network,
      senderAddress: address,
    });

    if (!result) {
      throw new Error("No response received from Stacks balance check");
    }
    console.log("Balance check response:", result.value.value);
    return BigInt(result.value.value);
  } catch (error) {
    console.error("Error getting Stacks balance:", error);
    return BigInt(0);
  }
}

// Transfer Stacks tokens
async function transferStacksTokens(amount) {
  try {
    const senderAddress = getAddressFromPrivateKey(STACKS_PRIVATE_KEY, network);

    const initialSenderBalance = await getStacksBalance(senderAddress);

    if (initialSenderBalance < BigInt(amount)) {
      throw new Error("Insufficient Stacks balance for transfer");
    }

    const functionArgs = [
      uintCV(parseInt(amount)),
      standardPrincipalCV(senderAddress),
      standardPrincipalCV(RECIPIENT_STACKS_ADDRESS),
      noneCV(),
    ];

    const txOptions = {
      senderKey: STACKS_PRIVATE_KEY,
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "transfer",
      functionArgs,
      validateWithAbi: true,
      network,
      anchorMode: 3,
      postConditionMode: 1,
      fee: BigInt(2000),
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction({
      transaction,
      network,
    });

    if (broadcastResponse.error) {
      throw new Error(broadcastResponse.error);
    }

    return broadcastResponse.txid;
  } catch (error) {
    throw error;
  }
}

// Main execution function
async function executeSwap(sip10Amount, bnbAmount) {
  console.log("=== Starting Token Swap ===\n");
  console.log(`SIP-10 Amount: ${sip10Amount}`);
  console.log(`BNB Amount: ${bnbAmount}`);
  console.log(`Stacks Recipient: ${RECIPIENT_STACKS_ADDRESS}`);
  console.log(`BNB Recipient: ${RECIPIENT_BNB_ADDRESS}\n`);

  try {
    // Check BNB balance first
    const bnbBalance = await checkBnbBalance(bnbWallet.address);
    const requiredBnb = ethers
      .parseEther(bnbAmount.toString())
      .add(MINIMUM_BNB_BALANCE);

    if (bnbBalance.lt(requiredBnb)) {
      throw new Error("Insufficient BNB balance for swap");
    }

    // Step 1: Execute Stacks transfer
    console.log("\nInitiating Stacks token transfer...");
    const stacksTxId = await transferStacksTokens(sip10Amount.toString());
    console.log("Stacks transaction ID:", stacksTxId);

    // Wait for Stacks transaction verification
    console.log("\nWaiting for Stacks transaction verification...");
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));

    // Step 2: Execute BNB transfer after Stacks verification
    console.log("\nInitiating BNB transfer...");
    const bnbTxId = await transferBNB(bnbAmount);
    console.log("BNB transaction hash:", bnbTxId);

    return {
      stacksTransactionId: stacksTxId,
      bnbTransactionId: bnbTxId,
      status: "completed",
    };
  } catch (error) {
    console.error("Error in token swap:", error);
    throw error;
  }
}

// Execute the swap
async function main() {
  try {
    // Example values: swap 100 SIP10 tokens for 0.1 BNB
    const result = await executeSwap(100, 0.1);
    console.log("\nSwap completed successfully!");
    console.log("Stack Transaction:", result.stacksTransactionId);
    console.log("BNB Transaction:", result.bnbTransactionId);
  } catch (error) {
    console.error("Swap failed:", error);
  }
}

// Run the script
main();
