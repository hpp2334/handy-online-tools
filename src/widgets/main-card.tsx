import classNames from "classnames";
import React from "react";
import styles from "./main-card.module.scss";

export interface MainCardProps {
  className?: string;
}

export function MainCard(props: React.PropsWithChildren<MainCardProps>) {
  return (
    <div className={classNames(styles.mainCard, props.className)}>
      {props.children}
    </div>
  );
}
