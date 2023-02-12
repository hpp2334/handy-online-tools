import { buildChannel, Sender } from "@/utils/channel";
import { safeGetFromMap } from "@/utils/common";
import { BridgeCode } from "./checksum.service";
import { bridgeAdapter } from "./wasm-prelude";

export interface BridgeCall<ARG, RET> {
  code: BridgeCode;
}

// 500MB
const FILE_CHUNK = 500 * 1024 * 1024;

class BridgeFileService {
  private _blob_map = new Map<number, Uint8Array>();
  private _stream_offset = new Map<number, number>();
  private _stream_blob_map = new Map<number, number>();
  private _alloc_blob_id = 0;
  private _alloc_stream_id = 100;

  constructor() {
    bridgeAdapter.build_file_stream = (blob_id: number): number => {
      if (!this._blob_map.has(blob_id)) {
        throw Error(`[BUG] blob id ${blob_id} invalid, blob not found`);
      }
      const id = ++this._alloc_stream_id;
      this._stream_offset.set(id, 0);
      this._stream_blob_map.set(id, blob_id);
      return id;
    };

    bridgeAdapter.next_file_chunk = (stream_id: number): Uint8Array | null => {
      const offset = safeGetFromMap(this._stream_offset, stream_id);
      let blob_id = safeGetFromMap(this._stream_blob_map, stream_id);
      let blob = safeGetFromMap(this._blob_map, blob_id);

      if (offset >= blob.byteLength) {
        this._stream_offset.delete(stream_id);
        this._stream_blob_map.delete(stream_id);
        return null;
      }
      const nextOffset = Math.min(offset + FILE_CHUNK, blob.byteLength);
      this._stream_offset.set(stream_id, nextOffset);
      return blob.slice(offset, nextOffset);
    };
  }

  private allocBlob(blob: Uint8Array): number {
    const id = ++this._alloc_blob_id;
    this._blob_map.set(id, blob);
    return id;
  }

  private deallocBlob(blob_id: number) {
    this._blob_map.delete(blob_id);
  }

  public async provideBlob<T>(
    blob: Uint8Array,
    within: (blob_id: number) => Promise<T>
  ): Promise<T> {
    const blob_id = this.allocBlob(blob);
    const res = await within(blob_id);
    this.deallocBlob(blob_id);
    return res;
  }
}

class BridgeService {
  private _call_id = 0;
  private _ret_tx_map = new Map<number, Sender<any>>();

  constructor() {
    bridgeAdapter.send_ret = (_code: number, ret: any, call_id: number) => {
      const tx = this._ret_tx_map.get(call_id);
      if (tx) {
        tx.send(ret);
        this._ret_tx_map.delete(call_id);
      }
    };
  }

  async call<ARG, RET>(sig: BridgeCall<ARG, RET>, arg: ARG): Promise<RET> {
    const id = this._call_id++;
    const [tx, rx] = buildChannel<RET>();
    this._ret_tx_map.set(id, tx);
    // wasm should import by import(), otherwise nextjs wouldn't bundle it
    const { call: wasmCall } = await import("../../rust-libs/pkg");
    wasmCall(sig.code, arg, id);
    return rx.toPromise();
  }
}

export const bridgeService = new BridgeService();
export const bridgeFileService = new BridgeFileService();
