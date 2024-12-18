import { useState, useEffect } from "react";
import { AppConfig, UserSession, showConnect } from "@stacks/connect";
import { Person } from "@stacks/profile";
import { StacksMainnet } from "@stacks/network";
import reactLogo from "./assets/react.svg";
import vitewindLogo from "./assets/vitewind.svg";

// Configure the app
const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

// Custom Button Component
const ConnectButton = ({ children, onClick, isConnected }) => {
  return (
    <button
      onClick={onClick}
      className={`
        px-6 py-2 
        text-lg 
        font-semibold 
        rounded-md 
        transition-all 
        duration-300 
        ease-in-out
        ${
          isConnected
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-[#183D3D] text-white hover:bg-[#7B9E8F]"
        }
      `}
    >
      {children}
    </button>
  );
};

function App() {
  const [userData, setUserData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check if already logged in
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      setUserData(userData);
      setIsConnected(true);
    } else if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((userData) => {
        setUserData(userData);
        setIsConnected(true);
      });
    }
  }, []);

  const connectWallet = () => {
    showConnect({
      userSession,
      network: StacksMainnet,
      appDetails: {
        name: "ViteWind Stacks App",
        icon: window.location.origin + vitewindLogo,
      },
      onFinish: () => {
        const userData = userSession.loadUserData();
        setUserData(userData);
        setIsConnected(true);
      },
      onCancel: () => {
        console.log("Login canceled");
      },
    });
  };

  const disconnectWallet = () => {
    userSession.signUserOut();
    setUserData(null);
    setIsConnected(false);
  };

  const handleConnect = () => {
    if (!isConnected) {
      connectWallet();
    } else {
      disconnectWallet();
    }
  };

  return (
    <div className="w-full h-screen bg-[#040D12] flex flex-col items-center justify-center gap-4 text-[#93B1A6]">
      <div className="flex items-center gap-12 select-none">
        <a
          href="https://vitewind.pages.dev"
          target="_blank"
          rel="noreferrer"
          className="transition-all duration-200 hover:drop-shadow-[0_0_40px_rgba(92,131,116,0.6)]"
        >
          <img src={vitewindLogo} alt="vitewind logo" className="w-32 h-32" />
        </a>
        <a
          href="https://reactjs.org/"
          target="_blank"
          rel="noreferrer"
          className="transition-all duration-200 hover:drop-shadow-[0_0_40px_rgba(92,131,116,0.6)]"
        >
          <img src={reactLogo} alt="react logo" className="w-32 h-32" />
        </a>
      </div>
      <h1 className="mt-4 text-5xl font-semibold">ViteWind + React + Stacks</h1>
      <div className="flex flex-col items-center justify-center gap-4 text-center mt-8">
        <ConnectButton onClick={handleConnect} isConnected={isConnected}>
          {isConnected ? "Disconnect" : "Connect Stacks Wallet"}
        </ConnectButton>
        {isConnected && userData && (
          <div className="text-sm text-[#93B1A6]">
            Connected Address:
            <code className="ml-2 px-2 py-1 bg-[#183D3D] rounded-sm">
              {userData.profile.stxAddress.mainnet.slice(0, 6)}...
              {userData.profile.stxAddress.mainnet.slice(-4)}
            </code>
          </div>
        )}
        <p className="text-sm text-[#93B1A6]">
          Edit{" "}
          <code className="px-1 py-1 text-sm font-semibold text-white bg-[#183D3D] rounded-sm">
            src/App.jsx
          </code>{" "}
          and save to test HMR
        </p>
      </div>
      <p className="mt-8 text-[#93B1A6]">
        Click on the ViteWind and React logos to learn more
      </p>
    </div>
  );
}

export default App;
