import clsx from "clsx"

import styles from "@/components/TrackForm/TrackFormMetaInfo/TrackFormMetaInfoLabel/index.module.css"

type Props = {
  label: string
  text: string
  isLeftAligned?: boolean
  isTextTruncated?: boolean
}

export const TrackFormMetaInfoLabel = ({
  label,
  text,
  isLeftAligned = false,
  isTextTruncated = false
}: Props) => {
  return (
    <div className={clsx(styles.trackFormMetaInfoLabel, isLeftAligned && styles.LeftAligned)}>
      <span className={styles.label}>{label}</span>
      <span
        className={clsx(
          styles.text,
          isLeftAligned && styles.LeftAligned,
          isTextTruncated && styles.Truncated
        )}
        title={text}
      >
        {text}
      </span>
    </div>
  )
}
