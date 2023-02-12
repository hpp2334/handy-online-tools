import Head from "next/head";
import Image from "next/image";
import { Inter } from "@next/font/google";
import {
  ChangeEventHandler,
  ReactEventHandler,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { Tabs } from "@/widgets/tab";
import { MainCard } from "@/widgets/main-card";
import { Button, SizedBox, TextArea, Title } from "@/widgets/components";
import { CommonLayout, Layout } from "@/widgets/layout";
import styles from "./checksum.module.scss";
import {
  batchDigest,
  DigestResultItem,
  DigestType,
} from "@/services/checksum.service";
import { bridgeFileService, bridgeService } from "@/services/bridge.service";
import { useForceUpdate } from "@/utils/hook";
import classNames from "classnames";
import { getNumbericEnumValues } from "@/utils/common";
import { ProgressBar } from "@/widgets/progress";
import { SEOHead } from "@/widgets/seo";

const AllDigestTypes = getNumbericEnumValues(DigestType);

const DigestLabels = {
  [DigestType.MD5]: "MD5",
  [DigestType.SHA1]: "SHA-1",
  [DigestType.SHA256]: "SHA-256",
};

const enum DisableSelectFileType {
  NonTypes,
}

type DigestRes = {
  name: string;
  opKey: string;
} & (
  | {
      name: string;
      status: "loading";
      progress: number;
    }
  | {
      status: "done";
      list: Array<DigestResultItem>;
    }
  | {
      status: "error";
      error: string;
    }
);

type State =
  | {
      status: "pending";
    }
  | {
      status: "not-pending";
      result: Array<DigestRes>;
    };

const useChecksumFile = () => {
  const [_filesSelected, _setFilesSelected] = useState<boolean>(false);
  const [_files, _setFiles] = useState<File[]>([]);
  const _digestResMapRef = useRef<Map<File, DigestRes>>(new Map());
  const [digestTypes, setDigestTypes] = useState<DigestType[]>([]);
  const [token, forceUpdate] = useForceUpdate();

  const disableSelectFileType: DisableSelectFileType | null = (() => {
    if (digestTypes.length === 0) {
      return DisableSelectFileType.NonTypes;
    }
    return null;
  })();

  const state = useMemo((): State => {
    if (!_filesSelected) {
      return {
        status: "pending",
      };
    }

    const digestList: Array<DigestRes> = [];
    for (const i in _files) {
      const file = _files[i];
      const digestRes = _digestResMapRef.current.get(file);
      if (digestRes) {
        digestList.push(digestRes);
      } else {
        digestList.push({
          opKey: "not-ready-" + i,
          name: file.name,
          status: "loading",
          progress: 0,
        });
      }
    }
    return {
      status: "not-pending",
      result: digestList,
    };
  }, [_filesSelected, _files, token]);

  const canReset = useMemo(() => {
    return (
      state.status === "not-pending" &&
      state.result.every((item) => item.status !== "loading")
    );
  }, [state]);

  const reset = useCallback(() => {
    _setFilesSelected(false);
    _digestResMapRef.current.clear();
  }, []);

  const updateCheckedDigestType = useCallback(
    (typ: DigestType, checked: boolean) => {
      setDigestTypes((typs) => {
        const nextTyps = typs.filter((t) => t !== typ);
        if (checked) {
          nextTyps.push(typ);
        }
        return nextTyps;
      });
    },
    []
  );

  const checksum = useCallback(
    (files: File[]) => {
      if (files.length === 0) {
        return;
      }

      _setFilesSelected(true);
      _setFiles(files);

      for (const i in files) {
        const file = files[i];
        const fileReader = new FileReader();
        fileReader.readAsArrayBuffer(file);
        fileReader.onload = async function (ev) {
          const buf = this.result;
          if (!buf || typeof buf === "string") {
            throw Error("[bug] buf is not buffer");
          }
          const res = await bridgeFileService.provideBlob(
            new Uint8Array(buf),
            async (blob_id) => {
              return await bridgeService.call(batchDigest, {
                typs: digestTypes,
                blob_id,
              });
            }
          );
          _digestResMapRef.current.set(file, {
            opKey: "done-" + i,
            name: file.name,
            status: "done",
            list: res,
          });
          forceUpdate();
        };
        fileReader.onprogress = function (ev) {
          _digestResMapRef.current.set(file, {
            opKey: "loading-" + i,
            name: file.name,
            status: "loading",
            progress: (ev.loaded / ev.total) * 100,
          });
          forceUpdate();
        };
        fileReader.onerror = function (ev) {
          _digestResMapRef.current.set(file, {
            opKey: "error-" + i,
            name: file.name,
            status: "error",
            error: ev.target?.error?.message ?? "Unknown error",
          });
          forceUpdate();
          console.error("fileReader error:", ev.target?.error);
        };
      }
    },
    [digestTypes]
  );

  return {
    state,
    disableSelectFileType,
    digestTypes,
    canReset,
    checksum,
    updateCheckedDigestType,
    reset,
  };
};

const enum TabKey {
  File,
  Text,
}

function ChecksumFiles() {
  const {
    state,
    disableSelectFileType,
    canReset,
    digestTypes,
    checksum,
    updateCheckedDigestType,
    reset,
  } = useChecksumFile();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={styles.checksumFiles}>
      {state.status === "pending" && (
        <>
          <div className={styles.selectTypes}>
            <div className={styles.title}>Select checksum types</div>
            <div className={styles.types}>
              {AllDigestTypes.map((typ) => (
                <label key={typ}>
                  <input
                    type="checkbox"
                    checked={digestTypes.includes(typ)}
                    onChange={(ev) => {
                      updateCheckedDigestType(typ, ev.target.checked);
                    }}
                  />
                  {DigestLabels[typ]}
                </label>
              ))}
            </div>
          </div>
          <div
            className={classNames({
              [styles.dropFile]: true,
              [styles.disabled]: disableSelectFileType !== null,
            })}
            onDrop={(ev) => {
              // prevent default action (open as link for some elements)
              ev.preventDefault();
              if (disableSelectFileType !== null) {
                return;
              }
              const files = Array.from(ev.dataTransfer.files);
              checksum(files);
            }}
            onDragOver={(ev) => {
              // prevent default to allow drop
              ev.preventDefault();
            }}
            onClick={() => {
              if (disableSelectFileType !== null) {
                return;
              }
              inputRef.current?.click();
            }}
          >
            {disableSelectFileType === DisableSelectFileType.NonTypes && (
              <>Should select at least one checksum type first</>
            )}
            {disableSelectFileType === null && (
              <>Select file or drop file here to checksum</>
            )}
          </div>
          <input
            ref={inputRef}
            style={{ display: "none" }}
            type="file"
            multiple
            onChange={(ev) => {
              const files = Array.from(ev.target.files ?? []);
              checksum(files);
            }}
          />
        </>
      )}
      {state.status === "not-pending" && (
        <div className={styles.result}>
          <div className={styles.toolbar}>
            <Button disabled={!canReset} onClick={reset}>
              Reset
            </Button>
          </div>
          <SizedBox height={10} />
          <div className={styles.operations}>
            {state.result.map((res, index) => (
              <div key={res.opKey} className={styles.operation}>
                {res.status === "loading" && (
                  <>
                    <div className={styles.title}>{res.name}</div>
                    <ProgressBar progress={res.progress} />
                  </>
                )}
                {res.status === "error" && (
                  <>
                    <div className={styles.title}>
                      <span>{res.name}</span>
                      <span> </span>
                      <span className={styles.errorTag}>Fail</span>
                    </div>
                    <div className={styles.error}>{res.error}</div>
                  </>
                )}
                {res.status === "done" && (
                  <>
                    <div className={styles.title}>{res.name}</div>
                    <div className={styles.checksumRows}>
                      {res.list.map((item) => (
                        <div key={item.typ} className={styles.checksumRow}>
                          <div className={styles.checksumType}>
                            {DigestLabels[item.typ]}
                          </div>
                          <TextArea
                            className={styles.checksumValue}
                            defaultValue={item.val}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Checksum() {
  const [selected, setSelected] = useState<number>(TabKey.File);

  return (
    <>
      <SEOHead
        subTitle="Checksum"
        description="calculate file checksum, support MD5, SHA-1, SHA-256"
      />
      <CommonLayout>
        <Title>Checksum</Title>
        {/* unimplment yet */}
        {/* <Tabs
          items={[
            {
              key: TabKey.File,
              label: "File",
            },
            {
              key: TabKey.Text,
              label: "Content",
            },
          ]}
          selected={selected}
          onSelect={(item) => setSelected(item.key)}
        />
        <SizedBox height={10} /> */}
        <MainCard className={styles.checksum}>
          <ChecksumFiles />
        </MainCard>
      </CommonLayout>
    </>
  );
}