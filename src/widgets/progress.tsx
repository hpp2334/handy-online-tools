import React from "react";
import styles from "./progress.module.scss";

interface ProgressBarProps {
  progress: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const progressStyle = {
    width: `${progress}%`,
  };

  return (
    <div className={styles.container}>
      <div className={styles.bar} style={progressStyle}></div>
    </div>
  );
};
ProgressBar.displayName = "ProgressBar";
