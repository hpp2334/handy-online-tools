import styles from "./appbar.module.scss";

export interface AppBarProps {
  title: string;
}

export function AppBar({ title }: AppBarProps) {
  return (
    <div className={styles.appbar}>
      <div className={styles.title}>{title}</div>
    </div>
  );
}
