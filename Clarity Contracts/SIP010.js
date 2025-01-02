import { makeContractDeploy, broadcastTransaction } from "@stacks/transactions";
import { STACKS_MAINNET } from "@stacks/network";
import { readFileSync } from "fs";
import { setTimeout } from "timers/promises";

// Retry configuration
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];
const MAX_RETRIES = 5;
const DEFAULT_FEE = 100000; // Default fee in microSTX (0.1 STX)

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

// Updated fee estimation function with better error handling
async function estimateFee() {
  try {
    // Try the new fee endpoint first
    const response = await fetch(
      "https://stacks-node-api.mainnet.stacks.co/v2/fees/transfer"
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.standard) {
      console.warn("No standard fee rate found, using default fee");
      return DEFAULT_FEE;
    }

    return parseInt(data.standard);
  } catch (error) {
    console.warn("Error estimating fee, using default fee:", error.message);
    return DEFAULT_FEE;
  }
}

async function deployContract() {
  try {
    const network = new STACKS_MAINNET(); // Instantiate the network object

    let contractCode;
    try {
      contractCode = readFileSync("./token.clar").toString();
    } catch (error) {
      throw new Error(`Failed to read contract file: ${error.message}`);
    }

    console.log("Estimating transaction fee...");
    const estimatedFee = await fetchWithRetry(estimateFee);
    console.log(`Using fee: ${estimatedFee} microSTX`);

    const txOptions = {
      contractName: "Token",
      codeBody: contractCode,
      senderKey:
        "f7984d5da5f2898dc001631453724f7fd44edaabdaa926d7df29e6ae3566492c01",
      network,
      anchorMode: 3,
      postConditionMode: 1,
      fee: estimatedFee,
    };

    console.log("Preparing contract deployment...");

    const transaction = await makeContractDeploy(txOptions);
    console.log("Broadcasting transaction...");

    try {
      const broadcastResponse = await broadcastTransaction({
        transaction,
        network: STACKS_MAINNET,
      });

      if (!broadcastResponse || !broadcastResponse.txid) {
        throw new Error("Invalid broadcast response");
      }

      const txId = broadcastResponse.txid;
      console.log(`Transaction broadcast successful. Transaction ID: ${txId}`);

      let status = "pending";
      let attempts = 0;
      const maxAttempts = 30;

      while (status === "pending" && attempts < maxAttempts) {
        attempts++;

        try {
          const checkStatus = async () => {
            const response = await fetch(
              `https://stacks-node-api.mainnet.stacks.co/extended/v1/tx/${txId}`
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
      throw new Error(`Failed to broadcast transaction: ${error.message}`);
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
