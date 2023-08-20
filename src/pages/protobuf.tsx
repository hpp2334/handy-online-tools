import type { SevenZipModule } from "7z-wasm";
import {
  FileEntry,
  FileEntryFile,
  FileType,
  parseFile,
  TypeInfoRecord,
} from "@/utils/file";
import { useAsyncMemo, useForceUpdate, useIsMount } from "@/utils/hook";
import {
  ActionIconButton,
  Button,
  TextArea,
  Title,
} from "@/widgets/components";
import { FileDrop } from "@/widgets/file-drop";
import { CommonLayout } from "@/widgets/layout";
import { MainCard } from "@/widgets/main-card";
import { SEOHead } from "@/widgets/seo";
import React, { useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { StreamLanguage } from "@codemirror/language";
import { protobuf } from "@codemirror/legacy-modes/mode/protobuf";
import { materialLight } from "@uiw/codemirror-theme-material";
import styles from "./protobuf.module.scss";
import classNames from "classnames";
import Loading from "@/widgets/loading";
import { AppBar } from "@/widgets/appbar";
import { copyText, downloadBuffer } from "@/utils/common";
import {
  encodeMessage,
  parseProtobufBytes as parseProtobufBytesInternal,
  ParseProtobufBytesItem,
  ParseProtobufBytesResult,
  WireType,
} from "@/services/protobuf.service";
import { BiDownload } from "react-icons/bi";

const DEFAULT_PROTOBUF = `syntax = "proto3";

message Point {
  int32 x = 1;
  int32 y = 2;
}

message Root {
  Point point = 1;
  int32 distance = 2;
}`;

const DEFAULT_JSON_DATA = `{
  "point": {
    "x": 2,
    "y": 1
  },
  "distance": 100
}`;

function useProtobuf() {
  const [message, setMessage] = useState<string>(DEFAULT_PROTOBUF);
  const [jsonData, setJsonData] = useState<string>(DEFAULT_JSON_DATA);
  const [error, setError] = useState<string>("");
  const [parsed, setParsed] = useState<ParseProtobufBytesResult | null>(null);
  const [rawBytes, setRawBytes] = useState<Uint8Array | null>(null);

  const parseProtoMessage = () => {
    try {
      const raw = encodeMessage(message, jsonData);
      setRawBytes(raw);
      const parsed = parseProtobufBytesInternal(raw);
      setParsed(parsed);
      setError("");
    } catch (err) {
      setRawBytes(null);
      setParsed(null);
      setError(err instanceof Error ? err.message : `${error}`);
    }
  };

  return {
    message,
    jsonData,
    parsed,
    error,
    rawBytes,
    parseProtoMessage,
    setMessage,
    setJsonData,
    setError,
  };
}

function ProtobufTable({
  items,
  paddingLeft = 0,
}: {
  items: ParseProtobufBytesItem[];
  paddingLeft?: number;
}) {
  return (
    <div
      className={styles.protobufTable}
      style={{
        paddingLeft,
      }}
    >
      <div className={styles.header}>
        <div className={styles.wireType}>WireType</div>
        <div className={styles.fieldTag}>FieldTag</div>
        <div className={styles.length}>Length</div>
        <div className={styles.value}>Value</div>
      </div>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <div className={styles.row}>
            <div className={styles.wireType}>{WireType[item.wireType]}</div>
            <div className={styles.fieldTag}>{item.fieldTag}</div>
            <div className={styles.length}>{item.length}</div>
            <div className={styles.value}>{item.value}</div>
          </div>
          {item.subItems.length > 0 && (
            <ProtobufTable
              items={item.subItems}
              paddingLeft={paddingLeft + 20}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function Protobuf() {
  const {
    message,
    jsonData,
    parsed,
    error,
    rawBytes,
    parseProtoMessage,
    setMessage,
    setJsonData,
  } = useProtobuf();

  return (
    <>
      <SEOHead subTitle="Protobuf" description="Protobuf parse" />
      <AppBar title="Protobuf" />
      <CommonLayout>
        <MainCard className={styles.protobuf}>
          <div className={styles.edit}>
            <div className={styles.codes}>
              <div className={styles.message}>
                <div>Proto Message</div>
                <CodeMirror
                  height="calc(100vh - 300px)"
                  width="400px"
                  value={message}
                  onChange={setMessage}
                  extensions={[StreamLanguage.define(protobuf)]}
                  theme={materialLight}
                />
              </div>
              <div className={styles.data}>
                <div>Json Description Data</div>
                <CodeMirror
                  height="calc(100vh - 300px)"
                  width="400px"
                  value={jsonData}
                  onChange={setJsonData}
                  extensions={[json()]}
                  theme={materialLight}
                />
              </div>
            </div>
            <div className={styles.panel}>
              <Button onClick={parseProtoMessage}>Parse Proto</Button>
            </div>
          </div>
          <div className={styles.output}>
            <div className={styles.header}>
              Output
              {rawBytes && (
                <ActionIconButton
                  DefaultIcon={BiDownload}
                  onClick={async () => {
                    if (rawBytes) {
                      downloadBuffer("data.bin", rawBytes);
                    }
                  }}
                />
              )}
            </div>
            {!parsed && !error && <div>Pending to parse...</div>}
            {error && <div>{error}</div>}
            {parsed && <ProtobufTable items={parsed.items} />}
          </div>
        </MainCard>
      </CommonLayout>
    </>
  );
}
