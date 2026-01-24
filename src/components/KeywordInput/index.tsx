import styles from "@/components/KeywordInput/index.module.css"
import { KeywordInputLoadingIcon } from "@/components/KeywordInput/KeywordInputLoadingIcon"
import { KeywordInputSearchIcon } from "@/components/KeywordInput/KeywordInputSearchIcon"

import type { ComponentProps } from "react"

type Props = {
  isLoading: boolean
} & Pick<ComponentProps<"input">, "value" | "onChange">

export const KeywordInput = ({ isLoading, value, onChange }: Props) => {
  return (
    <div className={styles.keywordInput}>
      <span aria-hidden="true" className={styles.search}>
        <KeywordInputSearchIcon />
      </span>
      <input
        className={styles.input}
        onChange={onChange}
        placeholder="キーワードを入力…"
        type="text"
        value={value}
      />
      {isLoading && (
        <span className={styles.loading}>
          <KeywordInputLoadingIcon />
        </span>
      )}
    </div>
  )
}
