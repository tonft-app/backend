import BN from "bn.js";
import { Cell, beginCell, Address, toNano } from "ton";

export function data(params: { ownerAddress: Address }): Cell {
  return beginCell().storeAddress(params.ownerAddress).endCell();
}

export function withdrawBalance(): Cell {
  return beginCell().storeUint(0x2, 32).endCell();
}