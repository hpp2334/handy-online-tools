import styles from "./appbar.module.scss";
import { BiMenu, BiX } from "react-icons/bi";
import { Features } from "./features";
import { useState } from "react";

export interface AppBarProps {
  title: string;
  hiddenMenu?: boolean;
}

function AppbarMenu({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  if (!visible) {
    return null;
  }

  return (
    <div className={styles.appbarMenu}>
      <BiX className={styles.closeBtn} onClick={onClose} />
      <Features onClickItem={onClose} />
    </div>
  );
}

export function AppBar({ title, hiddenMenu }: AppBarProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <div className={styles.appbar}>
        {!hiddenMenu && (
          <BiMenu className={styles.icon} onClick={() => setVisible(true)} />
        )}
        <div className={styles.title}>{title}</div>
      </div>
      <AppbarMenu visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}
