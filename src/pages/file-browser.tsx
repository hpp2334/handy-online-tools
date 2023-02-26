import type { SevenZipModule } from "7z-wasm";
import {
  FileEntry,
  FileEntryFile,
  FileType,
  parseFile,
  TypeInfoRecord,
} from "@/utils/file";
import { useAsyncMemo, useForceUpdate } from "@/utils/hook";
import { Button, Title } from "@/widgets/components";
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
import { BiChevronRight } from "react-icons/bi";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { javascript } from "@codemirror/lang-javascript";
import { materialLight } from "@uiw/codemirror-theme-material";
import styles from "./file-browser.module.scss";
import classNames from "classnames";
import Loading from "@/widgets/loading";
import { AppBar } from "@/widgets/appbar";

const enum Status {
  Pending,
  Loading,
  Loaded,
}

type State =
  | {
      status: Status.Pending | Status.Loading;
    }
  | {
      status: Status.Loaded;
      parsedEntry: FileEntry | null;
      selected: {
        entry: FileEntryFile;
      } | null;
      expandedEntryPaths: Set<string>;
    };

function useFileBrowser() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedEntry, setParsedEntry] = useState<FileEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<FileEntryFile | null>(
    null
  );
  const [status, setStatus] = useState(Status.Pending);
  const [token, forceUpdate] = useForceUpdate();
  const expandedEntryPathsRef = useRef(new Set<string>());

  const reset = () => {
    setParsedEntry(null);
    setSelectedEntry(null);
    setStatus(Status.Pending);
    expandedEntryPathsRef.current.clear();
  };

  const loadFile = async (files: File[]) => {
    if (files.length !== 1) {
      throw Error("only support one file");
    }
    const [file] = files;
    setFile(file);
    setStatus(Status.Loading);
    const entry = await parseFile(file);
    setFile(file);
    setStatus(Status.Loaded);
    setParsedEntry(entry);
  };

  const selectEntry = (entry: FileEntry) => {
    if (entry.type === "dir") {
      if (!expandedEntryPathsRef.current.has(entry.path)) {
        expandedEntryPathsRef.current.add(entry.path);
      } else {
        expandedEntryPathsRef.current.delete(entry.path);
      }
      forceUpdate();
    } else {
      setSelectedEntry(entry);
    }
  };

  const state: State = useMemo(() => {
    if (status !== Status.Loaded) {
      return {
        status,
      };
    }
    const ret: State = {
      status,
      parsedEntry,
      selected: !selectedEntry
        ? null
        : {
            entry: selectedEntry,
          },
      expandedEntryPaths: expandedEntryPathsRef.current,
    };
    return ret;
  }, [parsedEntry, selectedEntry, status, token]);

  return {
    state,
    loadFile,
    selectEntry,
    reset,
  };
}

interface FileTreeProps {
  items: FileEntry[];
  selected: FileEntryFile | null;
  expanded: Set<string>;
  onSelect: (entry: FileEntry) => void;
}

interface FileTreeInternalProps extends FileTreeProps {
  indent: number;
}

function FileTreeInternal(props: FileTreeInternalProps) {
  const { items, selected, expanded, indent, onSelect } = props;
  return (
    <>
      {items.map((item) => {
        const isSelected = item.path === selected?.path;
        const isExpand = expanded.has(item.path);

        return (
          <React.Fragment key={item.path}>
            <div
              style={{ paddingLeft: indent * 15 + 10 }}
              className={classNames({
                [styles.item]: true,
                [styles.selected]: isSelected,
              })}
              onClick={() => {
                onSelect(item);
              }}
            >
              {item.type === "file" && <>{item.name}</>}
              {item.type === "dir" && (
                <>
                  <BiChevronRight
                    className={classNames({
                      [styles.icon]: true,
                      [styles.expand]: isExpand,
                    })}
                  />
                  {item.name}
                </>
              )}
            </div>
            {item.type === "dir" && isExpand && (
              <FileTreeInternal
                {...props}
                items={item.children}
                indent={indent + 1}
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

function FileTree(props: FileTreeProps) {
  return (
    <div className={styles.fileTree}>
      <FileTreeInternal {...props} indent={0} />
    </div>
  );
}

interface MainContentProps {
  entry: FileEntryFile | null;
}

function MainContentCode({ entry }: { entry: FileEntryFile }) {
  const code =
    useAsyncMemo(async () => {
      if (!entry) {
        return "";
      }

      const data = await entry.data();
      const enc = new TextDecoder("utf-8");
      const ret = enc.decode(new Uint8Array(data));
      if (entry.fileType === FileType.Json) {
        // auto format json
        return JSON.stringify(JSON.parse(ret), null, 2);
      }
      return ret;
    }, [entry]) ?? "";

  return (
    <div>
      <CodeMirror
        value={code}
        readOnly
        extensions={[json(), javascript()]}
        theme={materialLight}
      />
    </div>
  );
}

function MainContentImage({ entry }: { entry: FileEntryFile }) {
  const url =
    useAsyncMemo(async () => {
      if (!entry) {
        return "";
      }

      const data = await entry.data();
      const blob = new Blob([data], {
        type: TypeInfoRecord[entry.fileType].mimeType[0] ?? "image/jpg",
      });
      return globalThis.URL.createObjectURL(blob);
    }, [entry]) ?? "";

  useEffect(() => {
    return () => {
      if (url) {
        globalThis.URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  return (
    <div>
      <img src={url} />
    </div>
  );
}

function MainContentDispatcher({ entry }: { entry: FileEntryFile }) {
  if (TypeInfoRecord[entry.fileType].isImage) {
    return <MainContentImage entry={entry} />;
  }
  return <MainContentCode entry={entry} />;
}

function MainContent({ entry }: MainContentProps) {
  return (
    <div className={styles.mainContent}>
      {!entry && (
        <div className={styles.defaultContent}>Select file from left</div>
      )}
      {entry && <MainContentDispatcher entry={entry} />}
    </div>
  );
}

export default function FileBrowser() {
  const { loadFile, state, selectEntry, reset } = useFileBrowser();

  return (
    <>
      <SEOHead
        subTitle="File Browser"
        description="An online viewer of zip, json, ..."
      />
      <AppBar title="File Browser" />
      <CommonLayout>
        <div className={styles.toolbar}>
          <Button disabled={state.status !== Status.Loaded} onClick={reset}>
            Reset
          </Button>
        </div>
        <MainCard>
          {state.status === Status.Pending && (
            <FileDrop onSelectOrDrop={loadFile} />
          )}
          {state.status === Status.Loading && <Loading text="Extracting..." />}
          {state.status === Status.Loaded && (
            <div className={styles.loadedFileBrowser}>
              <FileTree
                items={state.parsedEntry ? [state.parsedEntry] : []}
                expanded={state.expandedEntryPaths}
                selected={state.selected?.entry ?? null}
                onSelect={selectEntry}
              />
              <MainContent entry={state.selected?.entry ?? null} />
            </div>
          )}
        </MainCard>
      </CommonLayout>
    </>
  );
}
