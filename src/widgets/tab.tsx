import styles from "./tab.module.scss";
import cls from "classnames";

export interface TabItem {
  key: number;
  label: string;
}

export interface TabProps {
  items: Array<TabItem>;
  selected: number | null;
  onSelect: (item: TabItem) => void;
}

export function Tabs(props: TabProps) {
  const { items, selected, onSelect } = props;
  return (
    <div className={styles.container}>
      <div className={styles.tab}>
        {items.map((item) => (
          <div
            key={item.key}
            onClick={() => {
              onSelect(item);
            }}
            className={cls({
              [styles.item]: true,
              [styles.selected]: selected == item.key,
            })}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
