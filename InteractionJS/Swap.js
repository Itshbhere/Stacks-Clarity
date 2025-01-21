import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  FungibleConditionCode,
  standardPrincipalCV,
  uintCV,
  PostConditionMode,
  makeStandardSTXPostCondition,
  fetchCallReadOnlyFunction,
} from "@stacks/transactions";
import { STACKS_MAINNET } from "@stacks/network";
//   import { accountsApi } from '@stacks/blockchain-api-client';
// import { openContractCall } from "@stacks/connect";

// Configuration
const CONTRACT_ADDRESS = "SPXWGJQ101N1C1FYHK64TGTHN4793CHVKTJAT7VQ"; // Replace with your contract's address
const CONTRACT_NAME = "dex"; // Replace with your contract's name
const NETWORK = STACKS_MAINNET; // or new StacksMainnet() for mainnet

export class SwapContract {
  constructor(userAddress) {
    this.userAddress = userAddress;
  }

  // Get contract owner
  async getContractOwner() {
    try {
      const response = await this.callReadOnly("get-contract-owner");
      return response;
    } catch (error) {
      console.error("Error getting contract owner:", error);
      throw error;
    }
  }

  // Set new contract owner
  async setContractOwner(newOwnerAddress) {
    const functionArgs = [standardPrincipalCV(newOwnerAddress)];

    const txOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "set-contract-owner",
      functionArgs,
      senderAddress: this.userAddress,
      network: NETWORK,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction({
      transaction,
      network: this.network,
    });

    console.log("Stacks Transfer Complete");
    console.log("Transaction ID:", broadcastResponse.txid);

    return broadcastResponse.txid;
  }

  // Perform token swap
  async swap(stxAmount) {
    // Convert STX amount to microSTX (1 STX = 1,000,000 microSTX)
    const microStxAmount = stxAmount; //* 1000000;

    const functionArgs = [uintCV(microStxAmount)];

    // Add post condition to ensure user can't spend more than intended
    const postConditions = [
      makeStandardSTXPostCondition(
        this.userAddress,
        FungibleConditionCode.LessEqual,
        microStxAmount
      ),
    ];

    const txOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "swap",
      functionArgs,
      senderAddress: this.userAddress,
      network: NETWORK,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
      postConditions,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction({
      transaction,
      network: this.network,
    });

    console.log("Stacks Transfer Complete");
    console.log("Transaction ID:", broadcastResponse.txid);

    return broadcastResponse.txid;
  }

  // Helper method for read-only contract calls
  async callReadOnly(functionName, args = []) {
    try {
      const options = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName,
        functionArgs: args,
        network: NETWORK,
      };

      const result = await fetchCallReadOnlyFunction(options);
      return result;
    } catch (error) {
      console.error(`Error calling ${functionName}:`, error);
      throw error;
    }
  }
}

// Usage example:
export const initializeSwap = async (userAddress) => {
  try {
    const swapContract = new SwapContract(userAddress);
    return swapContract;
  } catch (error) {
    console.error("Error initializing swap contract:", error);
    throw error;
  }
};

// Example usage
const example = async () => {
  try {
    // Initialize contract with user's address
    const userAddress = "SP1X8ZTAN1JBX148PNJY4D1BPZ1QKCKV3H2SAZ7CN"; // Replace with actual user address
    const swapContract = await initializeSwap(userAddress);

    // Get contract owner
    const owner = await swapContract.getContractOwner();
    console.log("Contract owner:", owner);

    // Perform swap (amount in STX)
    const swapResult = await swapContract.swap(10); // Swap 10 STX
    console.log("Swap transaction:", swapResult);
  } catch (error) {
    console.error("Error in example:", error);
  }
};
