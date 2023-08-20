import protobuf from "protobufjs";

export enum WireType {
  VARINT,
  I64,
  LEN,
  SGROUP,
  EGROUP,
  I32,
}

export interface ParseProtobufBytesItem {
  wireType: WireType;
  fieldTag: string;
  length: number;
  value: string;
  subItems: ParseProtobufBytesItem[];
}

export interface ParseProtobufBytesResult {
  items: ParseProtobufBytesItem[];
}

export function parseProtobufBytes(
  bytes: Uint8Array
): ParseProtobufBytesResult {
  console.log(bytes);
  let offset = 0;

  const readVariant = (): [bigint, number] => {
    const startOffset = offset;
    while (offset < bytes.length && bytes[offset] >= 128) {
      offset++;
    }
    if (offset == bytes.length) {
      throw Error("cannot read type");
    }
    offset++;

    let ret = 0n;
    for (let i = offset - 1; i >= startOffset; i--) {
      ret = ret * 128n + BigInt(bytes[i] & 127);
    }
    return [ret, offset - startOffset];
  };

  const readNumber = (bytesLength: number) => {
    const len = Math.min(bytesLength, bytes.length - offset);
    let ret = 0n;
    for (let i = offset; i < offset + len; i++) {
      ret = ret * 256n + BigInt(bytes[i]);
    }
    offset += len;
    return ret.toString();
  };

  const readAsString = (size: number) => {
    const ret: string[] = [];

    if (offset + size > bytes.length) {
      throw Error(`cannot parse [${offset}, ${offset + size}) as string`);
    }

    let count = 0;
    while (offset + count < bytes.length && count < Math.min(size, 100)) {
      const curr = bytes[offset + count];
      ret.push(curr.toString(16).padStart(2, "0"));

      count++;
    }
    offset += size;
    return (
      ret.join(" ") + (count === size ? "" : ` (omit ${size - count} bytes)`)
    );
  };

  const res: ParseProtobufBytesResult = {
    items: [],
  };

  while (offset < bytes.length) {
    const [tag] = readVariant();

    const wireType = Number(tag & 7n) as WireType;
    const fieldTag = tag / 8n;
    const [length, value] = ((): [number, string] => {
      switch (wireType) {
        case WireType.I32:
          return [32, readNumber(4)];
        case WireType.I64:
          return [64, readNumber(8)];
        case WireType.VARINT: {
          const [value, length] = readVariant();
          return [length, value.toString()];
        }
        default: {
          const [_length, _] = readVariant();
          const length = Number(_length);
          const value = readAsString(length);
          return [length, value];
        }
      }
    })();
    const beforeValueOffset = offset - length;

    let subItems: ParseProtobufBytesItem[] = [];
    if (wireType === WireType.LEN && length > 0) {
      try {
        subItems = parseProtobufBytes(
          bytes.slice(beforeValueOffset, beforeValueOffset + length)
        ).items;
      } catch (_err) {}
    }

    res.items.push({
      wireType,
      fieldTag: fieldTag.toString(),
      length,
      value,
      subItems,
    });
  }
  return res;
}

export function encodeMessage(message: string, jsonData: string) {
  const { root } = protobuf.parse(message);
  const obj = JSON.parse(jsonData);
  const RootMessage = root.lookupType("Root");

  const bytes = RootMessage.encode(obj).finish();
  return bytes;
}
