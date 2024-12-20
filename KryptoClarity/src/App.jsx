import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App1 from "./Components/Mainpage";
import WalletCreator from "./Components/SecondPage";

function App() {
  const [count, setCount] = useState(0);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App1 />} />
        <Route path="/wallet" element={<WalletCreator />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
