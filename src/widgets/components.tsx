import styles from "@/widgets/components.module.scss";
import classNames from "classnames";
import React, { ForwardedRef, useState } from "react";

const buildStyled = <C extends keyof JSX.IntrinsicElements>(
  Comp: C,
  className?: string
) => {
  type InferElement<T> = T extends React.DetailedHTMLProps<
    React.HTMLAttributes<infer R>,
    infer R
  >
    ? R
    : unknown;
  type Props = JSX.IntrinsicElements[C];
  type Element = InferElement<Props>;

  const Tag = Comp as any;
  const _Styled = (props: Props, ref: ForwardedRef<Element>) => {
    return (
      <Tag
        {...props}
        ref={ref}
        className={classNames(props.className, className)}
      />
    );
  };
  _Styled.displayName = `Styled${Tag}`;
  const Styled = React.forwardRef<Element, Props>(_Styled);

  return Styled;
};

export const Title = buildStyled("h1", styles.title);
export const Button = buildStyled("button", styles.button);
export const TextArea = buildStyled("textarea", styles.textArea);

export function SizedBox({
  width,
  height,
}: {
  width?: number;
  height?: number;
}) {
  return <div style={{ width, height }} />;
}

export function ActionIconButton({
  DefaultIcon,
  onClick,
  LoadingIcon = DefaultIcon,
  SuccessIcon = DefaultIcon,
  FailIcon = DefaultIcon,
  duration = 3000,
}: {
  DefaultIcon: React.ComponentType<{ className?: string }>;
  onClick: () => Promise<void>;
  LoadingIcon?: React.ComponentType<{ className?: string }>;
  SuccessIcon?: React.ComponentType<{ className?: string }>;
  FailIcon?: React.ComponentType<{ className?: string }>;
  duration?: number;
}) {
  const enum Status {
    Idle,
    Loading,
    Success,
    Fail,
  }
  const [status, setStatus] = useState<Status>(Status.Idle);
  const Icon =
    status === Status.Idle
      ? DefaultIcon
      : status === Status.Loading
      ? LoadingIcon
      : status === Status.Success
      ? SuccessIcon
      : FailIcon;

  const handleClick = () => {
    if (status !== Status.Idle) {
      return;
    }
    const delayReset = () => {
      setTimeout(() => {
        setStatus(Status.Idle);
      }, duration);
    };

    setStatus(Status.Loading);
    onClick()
      .then(() => {
        setStatus(Status.Success);
        delayReset();
      })
      .catch(() => {
        setStatus(Status.Fail);
        delayReset();
      });
  };

  return (
    <div className={styles.actionIconButton} onClick={handleClick}>
      <Icon className={styles.icon} />
    </div>
  );
}
