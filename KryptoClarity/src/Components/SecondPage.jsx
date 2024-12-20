import React, { useState } from "react";
import { generateWallet, getStxAddress } from "@stacks/wallet-sdk";
import { STACKS_TESTNET, STACKS_MAINNET } from "@stacks/network";

const WalletCreator = () => {
  const [secretPhrase, setSecretPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [walletInfo, setWalletInfo] = useState(null);
  const [error, setError] = useState("");

  const createWallet = async () => {
    try {
      if (!secretPhrase || !password) {
        setError("Please provide both secret phrase and password");
        return;
      }

      const wallet = await generateWallet({
        secretKey: secretPhrase,
        password,
      });

      // Get the first account from the wallet
      const account = wallet.accounts[0];

      // Get both testnet and mainnet addresses
      const testnetAddress = getStxAddress({
        account,
        transactionVersion: STACKS_TESTNET,
      });
      const mainnetAddress = getStxAddress({
        account,
        transactionVersion: STACKS_MAINNET,
      });

      setWalletInfo({
        stxPrivateKey: account.stxPrivateKey,
        testnetAddress,
        mainnetAddress,
      });

      // Log the information
      console.log("Wallet Created:", {
        privateKey: account.stxPrivateKey,
        testnetAddress,
        mainnetAddress,
      });

      setError("");
    } catch (err) {
      setError("Error creating wallet: " + err.message);
      console.error("Wallet creation error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Create Stacks Wallet
        </h1>

        <div className="space-y-4">
          <div>
            <label className="block mb-2">Secret Phrase (Mnemonic)</label>
            <textarea
              className="w-full p-2 rounded bg-gray-800 text-white"
              rows="3"
              value={secretPhrase}
              onChange={(e) => setSecretPhrase(e.target.value)}
              placeholder="Enter your secret phrase..."
            />
          </div>

          <div>
            <label className="block mb-2">Password</label>
            <input
              type="password"
              className="w-full p-2 rounded bg-gray-800 text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <button
            onClick={createWallet}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Create Wallet
          </button>

          {error && <div className="text-red-500 mt-2">{error}</div>}

          {walletInfo && (
            <div className="bg-gray-800 p-4 rounded space-y-2">
              <h2 className="text-xl font-semibold mb-2">Wallet Information</h2>
              <div>
                <p className="font-semibold">Private Key:</p>
                <p className="break-all text-sm">{walletInfo.stxPrivateKey}</p>
              </div>
              <div>
                <p className="font-semibold">Testnet Address:</p>
                <p className="break-all text-sm">{walletInfo.testnetAddress}</p>
              </div>
              <div>
                <p className="font-semibold">Mainnet Address:</p>
                <p className="break-all text-sm">{walletInfo.mainnetAddress}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletCreator;
