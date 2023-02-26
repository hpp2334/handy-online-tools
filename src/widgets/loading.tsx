import React from "react";
import styles from "./loading.module.scss";

export interface LoadingProps {
  text: string;
}

export function Loading({ text }: LoadingProps) {
  return (
    <div className={styles.loaderWrapper}>
      <div className={styles.spinner} />
      {text && <p className={styles.text}>{text}</p>}
    </div>
  );
}

export default Loading;
