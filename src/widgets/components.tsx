import styles from "@/widgets/components.module.scss";
import classNames from "classnames";

const buildStyled = <C extends keyof JSX.IntrinsicElements>(
  Comp: C,
  className?: string
) => {
  const Tag = Comp as any;
  const Styled = (props: JSX.IntrinsicElements[C]) => {
    return (
      <Tag {...props} className={classNames(props.className, className)} />
    );
  };
  Styled.displayName = `Styled${Tag}`;

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
