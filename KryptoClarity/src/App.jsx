import { useState } from "react";
import reactLogo from "./assets/react.svg";
import vitewindLogo from "./assets/vitewind.svg";

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
            ? "bg-gray-500 text-white hover:bg-gray-600"
            : "bg-[#183D3D] text-white hover:bg-[#7B9E8F]"
        }
      `}
    >
      {children}
    </button>
  );
};

function App() {
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = () => {
    setIsConnected(!isConnected);
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
      <h1 className="mt-4 text-5xl font-semibold">ViteWind + React</h1>
      <div className="flex flex-col items-center justify-center gap-4 text-center mt-8">
        <ConnectButton onClick={handleConnect} isConnected={isConnected}>
          {isConnected ? "Disconnect" : "Connect"}
        </ConnectButton>
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
