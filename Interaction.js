// Import the module
import StacksTokenInteraction from "./token";

// Initialize with your contract details
const tokenInteraction = new StacksTokenInteraction(
  "ST1PQHQKV0RJXZFY1DGD0G1TDRZT5KT1TRS0TXKQ", // Contract Address
  "my-token-contract" // Contract Name
);

// Connect wallet
tokenInteraction.connectWallet();

// Get balance
const balance = await tokenInteraction.getTokenBalance();

console.log(balance);
// Transfer tokens
// await tokenInteraction.transferTokens(
//   "recipient-address",
//   100 // Amount
// );
