import { buildChannel, Receiver, Sender } from "@/utils/channel";
import { safeGetFromMap } from "@/utils/common";
import { BridgeCode } from "./checksum.service";
import { bridgeAdapter } from "./wasm-prelude";

export interface BridgeCall<ARG, RET> {
  code: BridgeCode;
}

// 300MB
const FILE_CHUNK = 300 * 1024 * 1024;

class BridgeFileService {
  private _blob_map = new Map<
    number,
    {
      blob: Blob;
      offset: number;
      loadedTx: Sender<number>;
    }
  >();
  private _alloc_blob_id = 0;

  constructor() {
    bridgeAdapter.next_file_chunk = async (
      blob_id: number
    ): Promise<Uint8Array | null> => {
      const blobInfo = safeGetFromMap(this._blob_map, blob_id);
      const offset = blobInfo.offset;

      if (offset >= blobInfo.blob.size) {
        this._blob_map.delete(blob_id);
        return null;
      }
      const nextOffset = Math.min(offset + FILE_CHUNK, blobInfo.blob.size);
      blobInfo.offset = nextOffset;

      const sliced = blobInfo.blob.slice(offset, nextOffset);
      return new Promise<Uint8Array>((res, rej) => {
        const fr = new FileReader();
        fr.readAsArrayBuffer(sliced);
        fr.onprogress = (ev) => {
          blobInfo.loadedTx.send(ev.loaded + offset);
        };
        fr.onload = function () {
          res(new Uint8Array(this.result as ArrayBuffer));
        };
        fr.onerror = function (ev) {
          rej(ev.target?.error);
        };
      });
    };
  }

  public provideBlob(blob: Blob) {
    const id = ++this._alloc_blob_id;
    const loadedChannel = buildChannel<number>();

    this._blob_map.set(id, {
      blob,
      offset: 0,
      loadedTx: loadedChannel[0],
    });

    return {
      blob_id: id,
      loaded_rx: loadedChannel[1],
    };
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
