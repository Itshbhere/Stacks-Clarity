import { makeContractDeploy, broadcastTransaction } from "@stacks/transactions";
import { STACKS_MAINNET } from "@stacks/network";
import { readFileSync } from "fs";
import { setTimeout } from "timers/promises";

// Retry configuration
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff
const MAX_RETRIES = 5;

// Helper function for delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function for API calls with retry logic
async function fetchWithRetry(fetchFunction, retryCount = 0) {
  try {
    return await fetchFunction();
  } catch (error) {
    if (error.message.includes("429") && retryCount < MAX_RETRIES) {
      const delayTime = RETRY_DELAYS[retryCount];
      console.log(
        `Rate limited. Waiting ${delayTime / 1000} seconds before retry ${
          retryCount + 1
        }/${MAX_RETRIES}...`
      );
      await delay(delayTime);
      return fetchWithRetry(fetchFunction, retryCount + 1);
    }
    throw error;
  }
}

// Function to estimate fee with retries
async function estimateFee() {
  try {
    const response = await fetch(
      "https://api.mainnet.hiro.so/v2/fees/transaction"
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.estimated_fee_scalar;
  } catch (error) {
    console.error("Error estimating fee:", error);
    throw error;
  }
}

async function deployContract() {
  try {
    // Network configuration
    const network = STACKS_MAINNET;

    // Read contract code
    let contractCode;
    try {
      contractCode = readFileSync("./token.clar").toString();
    } catch (error) {
      throw new Error(`Failed to read contract file: ${error.message}`);
    }

    console.log("Estimating transaction fee...");
    const estimatedFee = await fetchWithRetry(estimateFee);
    console.log(`Estimated fee: ${estimatedFee}`);

    // Transaction options
    const txOptions = {
      contractName: "Token",
      codeBody: contractCode,
      senderKey:
        "f7984d5da5f2898dc001631453724f7fd44edaabdaa926d7df29e6ae3566492c01",
      network,
      anchorMode: 3,
      postConditionMode: 1,
      fee: estimatedFee || 100000, // Use estimated fee or fallback
    };

    console.log("Preparing contract deployment...");

    // Create and broadcast transaction with retry logic
    const transaction = await fetchWithRetry(() =>
      makeContractDeploy(txOptions)
    );
    console.log("Broadcasting transaction...");

    const broadcastResponse = await fetchWithRetry(() =>
      broadcastTransaction(transaction, network)
    );

    const txId = broadcastResponse.txid;
    console.log(`Transaction broadcast successful. Transaction ID: ${txId}`);

    // Monitor transaction status with retry logic
    let status = "pending";
    let attempts = 0;
    const maxAttempts = 30;

    while (status === "pending" && attempts < maxAttempts) {
      attempts++;

      try {
        const checkStatus = async () => {
          const response = await fetch(
            `https://api.mainnet.stacks.co/extended/v1/tx/${txId}`
          );
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        };

        const txInfo = await fetchWithRetry(checkStatus);
        status = txInfo.tx_status;

        if (status === "success") {
          console.log("Contract deployment successful!");
          return {
            success: true,
            txId,
            contractId: `${txOptions.senderKey}.${txOptions.contractName}`,
          };
        } else if (status === "failed") {
          throw new Error(
            `Transaction failed: ${txInfo.tx_result?.repr || "Unknown error"}`
          );
        }

        console.log(
          `Waiting for confirmation... (Attempt ${attempts}/${maxAttempts})`
        );
        await delay(10000);
      } catch (error) {
        console.warn(`Failed to check transaction status: ${error.message}`);
        await delay(10000);
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error("Transaction confirmation timeout");
    }
  } catch (error) {
    console.error("Deployment failed:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Execute deployment
(async () => {
  console.log("Starting contract deployment process...");
  const result = await deployContract();

  if (result.success) {
    console.log("Deployment completed successfully!");
    console.log("Transaction ID:", result.txId);
    console.log("Contract ID:", result.contractId);
  } else {
    console.error("Deployment failed:", result.error);
    process.exit(1);
  }
})();
