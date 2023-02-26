import path from "path";

export const enum FileType {
  Unknown,
  ZIP,
  _7Z,
  RAR,
  Sketch,
  Json,
  PNG,
  JPG,
  GIF,
  WEBP,
}

export interface TypeInfo {
  mimeType: string[];
  ext: string[];
  isArchive?: boolean;
  isImage?: boolean;
}

export const TypeInfoRecord: Record<FileType, TypeInfo> = {
  [FileType.JPG]: {
    mimeType: ["image/jpg"],
    ext: ["jpg", "jpeg"],
    isImage: true,
  },
  [FileType.PNG]: {
    mimeType: ["image/png"],
    ext: ["png"],
    isImage: true,
  },
  [FileType.GIF]: {
    mimeType: ["image/gif"],
    ext: ["gif"],
    isImage: true,
  },
  [FileType.WEBP]: {
    mimeType: ["image/webp"],
    ext: ["webp"],
    isImage: true,
  },
  [FileType.ZIP]: {
    mimeType: ["application/zip"],
    ext: ["zip"],
    isArchive: true,
  },
  [FileType._7Z]: {
    mimeType: [""],
    ext: ["7z"],
    isArchive: true,
  },
  [FileType.RAR]: {
    mimeType: ["application/rar"],
    ext: ["rar"],
    isArchive: true,
  },
  [FileType.Sketch]: {
    mimeType: [],
    ext: ["sketch"],
    isArchive: true,
  },
  [FileType.Json]: {
    mimeType: ["application/json"],
    ext: ["json"],
  },
  [FileType.Unknown]: {
    mimeType: [],
    ext: [],
  },
};

export interface FileEntryFile {
  type: "file";
  name: string;
  path: string;
  fileType: FileType;
  data: () => Promise<ArrayBuffer>;
}
export interface FileEntryDir {
  type: "dir";
  name: string;
  path: string;
  children: FileEntry[];
}

export type FileEntry = FileEntryFile | FileEntryDir;

export const getFileType = (
  fileName: string,
  mimeType: string | undefined | null
): FileType => {
  if (mimeType) {
    for (const [t, info] of Object.entries(TypeInfoRecord)) {
      if (info.mimeType.includes(mimeType)) {
        return Number(t) as FileType;
      }
    }
  }
  const ext = path.extname(fileName);
  for (const [t, info] of Object.entries(TypeInfoRecord)) {
    if (info.ext.includes(ext.slice(1))) {
      return Number(t) as FileType;
    }
  }
  return FileType.Unknown;
};

async function getZipModule() {
  const { default: SevenZip } = await import("7z-wasm");
  const zip = SevenZip({
    print(_s) {},
  });
  console.log("7z-wasm loaded");
  return await zip;
}

export async function parseFile(file: File): Promise<FileEntry> {
  const data = await file.arrayBuffer();
  const fileType = getFileType(file.name, file.type);
  if (TypeInfoRecord[fileType].isArchive) {
    const EXTRACT_DIR = "/result";
    const zip = await getZipModule();
    // zip.FS.rmdir(EXTRACT_DIR);
    zip.FS.mkdir(EXTRACT_DIR, 0x777);
    zip.FS.writeFile("/" + file.name, new Uint8Array(data));
    zip.callMain(["x", "/" + file.name, `-o${EXTRACT_DIR}`]);

    const traverseImpl = (dirEntry: FileEntryDir): FileEntryDir => {
      const entries = zip.FS.readdir(dirEntry.path)
        .map((p) => [p, path.join(dirEntry.path, p)])
        .filter(([name, p]) => name !== "." && name !== "..")
        .map<FileEntry>(([name, p]) => {
          const stat = zip.FS.lstat(p);
          if (zip.FS.isDir(stat.mode)) {
            const nextEntry: FileEntry = {
              type: "dir",
              name,
              path: p,
              children: [],
            };
            return traverseImpl(nextEntry);
          } else {
            return {
              type: "file",
              name,
              path: p,
              fileType: getFileType(name, null),
              data: async () => zip.FS.readFile(p),
            };
          }
        });
      entries.sort((a, b) => {
        if (a.type !== b.type) {
          const fn = (entry: FileEntry) => (entry.type === "file" ? 1 : 0);
          return fn(a) - fn(b);
        }
        return a.name.localeCompare(b.name);
      });
      dirEntry.children = entries;
      return dirEntry;
    };

    const entry = traverseImpl({
      type: "dir",
      name: EXTRACT_DIR.slice(1),
      path: EXTRACT_DIR,
      children: [],
    });
    return entry;
  }

  return {
    type: "file",
    name: file.name,
    path: "/" + file.name,
    fileType: getFileType(file.name, null),
    data: () => file.arrayBuffer(),
  };
}
