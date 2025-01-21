import { initializeSwap } from "./Swap.js";

const userAddress = "SP1X8ZTAN1JBX148PNJY4D1BPZ1QKCKV3H2SAZ7CN";
const swapContract = await initializeSwap(userAddress);
await swapContract.swap(10); // Swap 10 STX
