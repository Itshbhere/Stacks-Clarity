const {
  makeContractCall,
  broadcastTransaction,
  Cl,
  Pc,
  standardPrincipalCV,
} = require("@stacks/transactions");
const { STACKS_TESTNET } = require("@stacks/network");
const fetch = require("node-fetch");
const { none } = require("@stacks/transactions/dist/cl");
const networks = STACKS_TESTNET;
global.fetch = fetch;
// Add an optional post condition
const condition01 = Pc.principal("ST11BRE3ZZT0R0V8NDCFEZ224RH2M0HDMSD5ASJY5")
  .willSendGte(250)
  .ustx();
// Sender's private key and recipient address
const senderPrivateKey =
  "top find mean better item trim orphan dolphin cart remain nation leaf caught fatal fiscal want nominee dinner task scan final bench blame degree"; // Replace with actual private key
const senderAddress = ""; // Replace with actual sender address
const recipientAddress = ""; // Replace with actual recipient address
const amount = 10000;
async function sendTransaction() {
  const txOptions = {
    contractAddress: "ST11BRE3ZZT0R0V8NDCFEZ224RH2M0HDMSD5ASJY5",
    contractName: "clarity-coin",
    functionName: "mint",
    functionArgs: [
      Cl.uint(amount), // Amount of tokens to transfer
      //standardPrincipalCV(senderAddress),     // Sender's address (principal)
      standardPrincipalCV(recipientAddress),
      //Cl.none(), // Recipient's address (principal)
    ],
    postConditions: [],
    validateWithAbi: true, // check if the arguments given are compatible with the function
    senderKey: "",
    network: networks,
    fee: 1000, // for mainnet, use 'mainnet'
  };
  try {
    // Create the transaction
    let transaction = await makeContractCall(txOptions);
    // Broadcast the transaction
    let broadcastResponse = await broadcastTransaction({
      transaction,
      network: networks,
    });
    // Check response
    if (broadcastResponse.error) {
      console.error("Transaction broadcast failed:", broadcastResponse.error);
    } else {
      console.log("Transaction successful. TxID:", broadcastResponse.txid);
    }
  } catch (error) {
    console.error("Error creating or broadcasting transaction:", error);
  }
}
// let  transaction =  makeContractCall(txOptions);
// // broadcast to the network
// let response =  broadcastTransaction({ transaction, network: networks });
// console.log(response.txid);
// Call the function to execute the transfer
sendTransaction();
