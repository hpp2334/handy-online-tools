import React from "react";
import styles from "./layout.module.scss";

export type LayoutMainProps = React.PropsWithChildren<{}>;

export type LayoutProps = React.PropsWithChildren<{}>;
export type CommonLayoutProps = React.PropsWithChildren<{}>;

function Main({ children }: LayoutMainProps) {
  return <div className={styles.main}>{children}</div>;
}

export function Layout({ children }: LayoutProps) {
  return <main className={styles.layout}>{children}</main>;
}
Layout.Main = Main;

export function CommonLayout({ children }: CommonLayoutProps) {
  return (
    <Layout>
      <Layout.Main>{children}</Layout.Main>
    </Layout>
  );
}
