import { useRouter } from "next/router";
import { BiHash, BiFileBlank } from "react-icons/bi";
import styles from "./features.module.scss";

const config = [
  {
    name: "Checksum",
    Icon: BiHash,
    path: "/checksum",
    description: "Calculate checksum of file, supporting MD5, SHA-1, SHA-256",
  },
  {
    name: "File Browser",
    Icon: BiFileBlank,
    path: "/file-browser",
    description: "View archiver, code file, image file",
  },
];

export interface FeaturesProps {
  style?: React.CSSProperties;
  onClickItem?: () => void;
}

export function Features(props: FeaturesProps) {
  const router = useRouter();

  return (
    <div className={styles.features} style={props.style}>
      {config.map((conf) => (
        <div
          className={styles.item}
          onClick={() => {
            router.push(conf.path);
            props.onClickItem?.();
          }}
        >
          <conf.Icon className={styles.icon} />
          <div className={styles.title}>{conf.name}</div>
          <div className={styles.description}>{conf.description}</div>
        </div>
      ))}
    </div>
  );
}
