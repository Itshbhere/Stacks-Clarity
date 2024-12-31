import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

async function monitorTokenTransfers(walletAddress, tokenMintAddress) {
  try {
    // Validate addresses
    if (!PublicKey.isOnCurve(walletAddress)) {
      throw new Error("Invalid wallet address");
    }
    if (!PublicKey.isOnCurve(tokenMintAddress)) {
      throw new Error("Invalid token mint address");
    }

    // Connect to Solana with custom commitment and rate limiting configs
    const connection = new Connection(clusterApiUrl("devnet"), {
      commitment: "confirmed",
      wsEndpoint: clusterApiUrl("devnet").replace("https", "wss"),
      confirmTransactionInitialTimeout: 60000,
      httpHeaders: {
        "solana-client": `token-monitor-${Date.now()}`,
      },
    });

    // Convert addresses to PublicKeys
    const accountPubKey = new PublicKey(walletAddress);
    const mintPubKey = new PublicKey(tokenMintAddress);

    console.log("Starting to monitor token transfers...");
    console.log(`Wallet Address: ${walletAddress}`);
    console.log(`Token Mint Address: ${tokenMintAddress}`);

    // Get token accounts first
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      accountPubKey,
      { mint: new PublicKey(tokenMintAddress) }
    );

    console.log(
      `Found ${tokenAccounts.value.length} token accounts to monitor`
    );

    // Store previous balances for each token account
    const previousBalances = new Map();

    // Initialize previous balances
    for (const tokenAccount of tokenAccounts.value) {
      previousBalances.set(
        tokenAccount.pubkey.toString(),
        tokenAccount.account.data.parsed.info.tokenAmount.uiAmount
      );
    }

    // Keep track of last processed slot to avoid duplicates
    let lastProcessedSlot = 0;

    // Monitor specific token accounts instead of all program accounts
    const subscriptionPromises = tokenAccounts.value.map(
      async (tokenAccount) => {
        return connection.onAccountChange(
          tokenAccount.pubkey,
          async (accountInfo, context) => {
            try {
              // Avoid processing the same slot twice
              if (context.slot <= lastProcessedSlot) {
                return;
              }
              lastProcessedSlot = context.slot;

              const tokenAccountInfo = await connection.getParsedAccountInfo(
                tokenAccount.pubkey
              );

              const parsedData = tokenAccountInfo.value?.data.parsed;
              if (parsedData?.info?.mint === mintPubKey.toString()) {
                const currentBalance = parsedData.info.tokenAmount.uiAmount;
                const previousBalance = previousBalances.get(
                  tokenAccount.pubkey.toString()
                );
                const transferAmount = currentBalance - previousBalance;

                // Update stored balance
                previousBalances.set(
                  tokenAccount.pubkey.toString(),
                  currentBalance
                );

                console.log("\nToken Transfer Detected!");
                console.log("Slot:", context.slot);
                console.log("Account:", tokenAccount.pubkey.toString());
                console.log("Previous Balance:", previousBalance);
                console.log("Current Balance:", currentBalance);
                console.log(
                  `Transfer Amount: ${Math.abs(transferAmount)} ${
                    transferAmount > 0 ? "(RECEIVED)" : "(SENT)"
                  }`
                );
                console.log("Timestamp:", new Date().toLocaleString());

                // Implement exponential backoff for transaction details
                await new Promise((resolve) => setTimeout(resolve, 1000));

                try {
                  const signatures = await connection.getSignaturesForAddress(
                    tokenAccount.pubkey,
                    { limit: 1 }
                  );

                  if (signatures.length > 0) {
                    await new Promise((resolve) => setTimeout(resolve, 500));

                    const transaction = await connection.getParsedTransaction(
                      signatures[0].signature,
                      {
                        maxSupportedTransactionVersion: 0,
                        commitment: "confirmed",
                      }
                    );

                    // Get sender and receiver addresses from transaction logs
                    const logs = transaction?.meta?.logMessages || [];
                    const transferLog = logs.find((log) =>
                      log.includes("Transfer")
                    );
                    if (transferLog) {
                      console.log("Transfer Log:", transferLog);
                    }

                    console.log(
                      "Transaction Signature:",
                      signatures[0].signature
                    );
                  }
                } catch (error) {
                  if (error.toString().includes("429")) {
                    console.log(
                      "Rate limit reached, waiting before fetching transaction details..."
                    );
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                  } else {
                    console.error("Error fetching transaction details:", error);
                  }
                }
              }
            } catch (error) {
              console.error("Error processing token transfer:", error);
              if (error.toString().includes("429")) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
              }
            }
          },
          "confirmed"
        );
      }
    );

    // Wait for all subscriptions to be set up
    const subscriptionIds = await Promise.all(subscriptionPromises);
    console.log(`Successfully set up ${subscriptionIds.length} monitors`);

    // Return subscription IDs for cleanup
    return subscriptionIds;
  } catch (error) {
    console.error("Error setting up monitor:", error);
    throw error;
  }
}

// Example usage with real Solana addresses
const WALLET_ADDRESS = "wHPN297UsAPwDsJDxKgCWCVTEWXBJ7divqnKW4fxKYj"; // Example devnet address
const TOKEN_MINT_ADDRESS = "6TpnnQFFjbyruU4q96x1mygUUynQ9uRxSAWymuAK9FYz"; // Example SOL token mint

monitorTokenTransfers(WALLET_ADDRESS, TOKEN_MINT_ADDRESS)
  .then((subscriptionIds) => {
    console.log(`Monitor started with ${subscriptionIds.length} subscriptions`);
  })
  .catch((error) => {
    console.error("Failed to start monitor:", error);
    process.exit(1);
  });
