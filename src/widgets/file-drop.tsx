import classNames from "classnames";
import React, { useRef } from "react";
import styles from "./file-drop.module.scss";

export interface FileDropProps {
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onSelectOrDrop: (files: File[]) => void;
  contentRender?: () => React.ReactElement;
}

export function FileDrop(props: FileDropProps) {
  const {
    multiple,
    disabled,
    className,
    style,
    onSelectOrDrop,
    contentRender,
  } = props;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div
        style={style}
        className={classNames(
          {
            [styles.fileDrop]: true,
            [styles.disabled]: disabled,
          },
          className
        )}
        onDrop={(ev) => {
          // prevent default action (open as link for some elements)
          ev.preventDefault();
          if (disabled) {
            return;
          }
          const files = Array.from(ev.dataTransfer.files);
          onSelectOrDrop(files);
        }}
        onDragOver={(ev) => {
          // prevent default to allow drop
          ev.preventDefault();
        }}
        onClick={() => {
          if (disabled) {
            return;
          }
          inputRef.current?.click();
        }}
      >
        {contentRender && contentRender()}
        {!contentRender && "Drop or select File here"}
      </div>
      <input
        ref={inputRef}
        style={{ display: "none" }}
        type="file"
        multiple={multiple}
        onChange={(ev) => {
          const files = Array.from(ev.target.files ?? []);
          onSelectOrDrop(files);
        }}
      />
    </>
  );
}
