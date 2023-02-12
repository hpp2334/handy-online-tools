import "./wasm-prelude";
import { BridgeCall } from "./bridge.service";

export enum DigestType {
  MD5 = 0,
  SHA1 = 1,
  SHA256 = 2,
}

export enum BridgeCode {
  BatchDigest = 0,
}

export interface BatchChecksumArg {
  typs: DigestType[];
  blob_id: number;
}

export interface DigestResultItem {
  typ: DigestType;
  val: string;
}

export const batchDigest: BridgeCall<BatchChecksumArg, DigestResultItem[]> = {
  code: BridgeCode.BatchDigest,
};
