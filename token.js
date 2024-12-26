import { AppConfig, UserSession, showConnect } from "@stacks/connect";
import { cvToJSON, uintCV, standardPrincipalCV } from "@stacks/transactions";
import {
  makeStandardContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
} from "@stacks/stacks-transactions";

class StacksTokenInteraction {
  constructor(contractAddress, contractName) {
    // App configuration
    const appConfig = new AppConfig(["store_write"]);
    this.userSession = new UserSession({ appConfig });

    // Contract details
    this.contractAddress = contractAddress;
    this.contractName = contractName;
  }

  // Wallet Connection Method
  connectWallet() {
    showConnect({
      appDetails: {
        name: "Token Interaction App",
        icon: window.location.origin + "/logo.svg",
      },
      onFinish: () => {
        window.location.reload();
      },
      userSession: this.userSession,
    });
  }

  // Check if wallet is connected
  isWalletConnected() {
    return this.userSession.isUserSignedIn();
  }

  // Get Connected Wallet Address
  getAddress() {
    if (!this.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }
    return this.userSession.loadUserData().profile.stxAddress.mainnet;
  }

  // Fetch Token Balance
  async getTokenBalance() {
    if (!this.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    const address = this.getAddress();

    try {
      const response = await this.contractCall({
        functionName: "get-balance",
        functionArgs: [standardPrincipalCV(address)],
      });

      return cvToJSON(response).value;
    } catch (error) {
      console.error("Balance fetch error:", error);
      throw error;
    }
  }

  // Generic Contract Call Method
  async contractCall({ functionName, functionArgs = [], network = "mainnet" }) {
    if (!this.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    const transaction = await makeStandardContractCall({
      contractAddress: this.contractAddress,
      contractName: this.contractName,
      functionName: functionName,
      functionArgs: functionArgs,
      senderAddress: this.getAddress(),
      network:
        network === "mainnet" ? new StacksMainnet() : new StacksTestnet(),
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
    });

    return transaction;
  }

  // Token Transfer Method
  async transferTokens(recipient, amount) {
    try {
      const transaction = await this.contractCall({
        functionName: "transfer",
        functionArgs: [
          uintCV(amount),
          standardPrincipalCV(this.getAddress()),
          standardPrincipalCV(recipient),
        ],
      });

      const txid = await broadcastTransaction(transaction);
      return txid;
    } catch (error) {
      console.error("Transfer error:", error);
      throw error;
    }
  }

  // Get Token Metadata
  async getTokenMetadata() {
    const metadata = {};
    const metadataMethods = [
      "get-name",
      "get-symbol",
      "get-decimals",
      "get-total-supply",
    ];

    for (const method of metadataMethods) {
      try {
        const response = await this.contractCall({
          functionName: method,
        });
        metadata[method.replace("get-", "")] = cvToJSON(response).value;
      } catch (error) {
        console.error(`Error fetching ${method}:`, error);
      }
    }

    return metadata;
  }

  // Logout Method
  logout() {
    this.userSession.signUserOut();
  }
}

// Example Usage
export function initializeTokenInteraction(contractAddress, contractName) {
  const tokenInteraction = new StacksTokenInteraction(
    contractAddress,
    contractName
  );

  // Connect Wallet Button
  document.getElementById("connect-wallet").addEventListener("click", () => {
    tokenInteraction.connectWallet();
  });

  // Check Balance Button
  document
    .getElementById("check-balance")
    .addEventListener("click", async () => {
      try {
        const balance = await tokenInteraction.getTokenBalance();
        document.getElementById("balance-display").textContent = balance;
      } catch (error) {
        alert("Failed to fetch balance");
      }
    });

  return tokenInteraction;
}

// Export for direct import and use
export default StacksTokenInteraction;
