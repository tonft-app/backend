import * as main from "../contracts/main";
import { Address, toNano, TupleSlice, WalletContract } from "ton";
import { sendInternalMessageWithWallet } from "../test/helpers";

export function initData() {
  return main.data({
    ownerAddress: Address.parseFriendly("EQBjR2EVz0M7i_3hZ_AfpOygwB4jUGQooCrKbUM32sCucKDS").address,
  });
}

export function initMessage() {
  return main.withdrawBalance();
}

export async function postDeployTest(walletContract: WalletContract, secretKey: Buffer, contractAddress: Address) {
  const message = main.withdrawBalance();
  await sendInternalMessageWithWallet({ walletContract, secretKey, to: contractAddress, value: toNano(0.02), body: message });
  console.log(`# Sent balance withdraw message to ${contractAddress}`);
}
