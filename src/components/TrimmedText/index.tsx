import clsx from "clsx"

import type { ComponentProps } from "react"

import styles from "@/components/TrimmedText/index.module.css"

type Props = Pick<ComponentProps<"span">, "className" | "children">

export const TrimmedText = ({ className, children }: Props) => {
  return <span className={clsx(className, styles.trimmedText)}>{children}</span>
}
