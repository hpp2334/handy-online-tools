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
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BiCheck,
  BiChevronRight,
  BiCopy,
  BiDownload,
  BiTrash,
} from "react-icons/bi";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { javascript } from "@codemirror/lang-javascript";
import { materialLight } from "@uiw/codemirror-theme-material";
import styles from "./clipboard.module.scss";
import classNames from "classnames";
import Loading from "@/widgets/loading";
import { AppBar } from "@/widgets/appbar";
import { copyText, downloadBuffer } from "@/utils/common";

// const enum Status {
//   PermissionPending,
//   AnyPermissionRejected,
//   PermissionAccepted,
// }

// function useClipboard() {
//   const readPermissionRef = useRef<PermissionState>("denied");
//   const writePermissionRef = useRef<PermissionState>("denied");
//   const isMount = useIsMount();
//   const [_, forceUpdate] = useForceUpdate();

//   useEffect(() => {
//     // not support in SSR
//     if (!navigator || !navigator.clipboard) {
//       return;
//     }

//     let timerId: number | undefined;
//     const fn = async () => {
//       const items = await navigator.clipboard.read();
//       if (!isMount()) {
//         return;
//       }
//       forceUpdate();
//     };
//     fn();

//     return () => {
//       clearTimeout(timerId);
//     };
//   }, []);

//   return {
//     readPermission: readPermissionRef.current,
//     writePermission: writePermissionRef.current,
//   };
// }

const enum Status {
  Pending,
  Loaded,
}

interface CItem {
  type: string;
  data: string;
}

type State =
  | {
      status: Status.Pending;
    }
  | {
      status: Status.Loaded;
      items: CItem[];
    };

function formatSize(byteSize: number) {
  const m = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (i < m.length) {
    if (byteSize < 1024) {
      break;
    }
    byteSize /= 1024;
    i++;
  }
  if (i < m.length) {
    return `${byteSize.toFixed(2)} ${m[i]}`;
  }
  return `${byteSize.toFixed(2)} PB`;
}

function useClipboard({ ref }: { ref: React.RefObject<HTMLTextAreaElement> }) {
  const [status, setStatus] = useState<Status>(Status.Pending);
  const [items, setItems] = useState<CItem[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  const initRef = useCallback(() => {
    const current = ref.current;
    if (!current) {
      return;
    }
    function fn(this: HTMLTextAreaElement, ev: ClipboardEvent) {
      ev.stopPropagation();
      ev.preventDefault();
      const clipboardData = ev.clipboardData;
      if (!clipboardData) {
        return;
      }
      const items = clipboardData.types.map((t) => ({
        type: t,
        data: clipboardData.getData(t),
      }));
      setItems(items);
      setFiles(Array.from(clipboardData.files));
    }
    current.addEventListener("paste", fn);

    return () => {
      current.removeEventListener("paste", fn);
    };
  }, []);

  return {
    items,
    files,
    initRef,
  };
}

function ClipboardItemCard({ item }: { item: CItem }) {
  const isText = item.type.startsWith("text/");
  return (
    <div className={styles.item}>
      <div className={styles.type}>{item.type}</div>
      <div className={styles.content}>{item.data}</div>
      <div className={styles.bar}>
        {isText && (
          <ActionIconButton
            DefaultIcon={BiCopy}
            SuccessIcon={BiCheck}
            onClick={async () => {
              copyText(item.data);
            }}
          />
        )}
        <ActionIconButton
          DefaultIcon={BiDownload}
          SuccessIcon={BiCheck}
          onClick={async () => {
            const enc = new TextEncoder();
            const buf = enc.encode(item.data);
            downloadBuffer("clipboard" + (isText ? ".txt" : ""), buf);
          }}
        />
      </div>
    </div>
  );
}

function ClipboardFileCard({ file }: { file: File }) {
  return (
    <div className={styles.file}>
      <div className={styles.name}>{file.name}</div>
      <div className={styles.tags}>
        <div className={styles.tag}>{formatSize(file.size)}</div>
        <div className={styles.tag}>{file.type || "unknown"}</div>
      </div>
      <div className={styles.bar}>
        <ActionIconButton
          DefaultIcon={BiDownload}
          SuccessIcon={BiCheck}
          onClick={async () => {
            const buf = await file.arrayBuffer();
            downloadBuffer(file.name, buf);
          }}
        />
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className={styles.emptyContainer}>
      <BiTrash className={styles.icon} />
      <span className={styles.text}>{text}</span>
    </div>
  );
}

export default function Clipboard() {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { items, files, initRef } = useClipboard({
    ref: textAreaRef,
  });

  useEffect(() => {
    initRef();
  }, [initRef]);

  return (
    <>
      <SEOHead subTitle="Clipboard" description="Read content in clipboard" />
      <AppBar title="Clipboard" />
      <CommonLayout>
        <MainCard className={styles.clipboard}>
          <TextArea
            className={styles.textarea}
            ref={textAreaRef}
            placeholder="Paste here to read clipboard."
          />
          <h2 className={styles.title}>Clipboard Items</h2>
          <div className={styles.container}>
            {items.map((item, idx) => (
              <ClipboardItemCard key={idx} item={item} />
            ))}
            {items.length === 0 && <Empty text="Empty Items" />}
          </div>
          <h2 className={styles.title}>Clipboard Files</h2>
          <div className={styles.container}>
            {files.map((file, idx) => (
              <ClipboardFileCard key={idx} file={file} />
            ))}
            {files.length === 0 && <Empty text="Empty Files" />}
          </div>
        </MainCard>
      </CommonLayout>
    </>
  );
}
