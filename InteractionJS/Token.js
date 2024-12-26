import { AppConfig, UserSession } from "@stacks/auth";
import { StacksTestnet } from "@stacks/network";
import {
  AnchorMode,
  makeContractCall,
  standardPrincipalCV,
} from "@stacks/transactions";

async function checkTokenBalance() {
  const appConfig = new AppConfig(["store_write", "publish_data"]);
  const userSession = new UserSession({ appConfig });

  try {
    // For testing without actual authentication
    const mockAddress = "ST1X8ZTAN1JBX148PNJY4D1BPZ1QKCKV3H3CK5ACA";

    const contractAddress = "ST1X8ZTAN1JBX148PNJY4D1BPZ1QKCKV3H3CK5ACA";
    const contractName = "Token"; // Replace with your actual contract name
    const functionName = "get_balance";

    // Create a standard principal Clarity value for the address
    const args = [standardPrincipalCV(mockAddress)];

    const call = await makeContractCall({
      contractAddress,
      contractName,
      functionName,
      functionArgs: args,
      senderAddress: mockAddress,
      network: new StacksTestnet(),
      anchorMode: AnchorMode.Any,
    });

    console.log("Contract Call:", call);
  } catch (error) {
    console.error("Error checking token balance:", error);
    console.error(error.stack);
  }
}

checkTokenBalance();
