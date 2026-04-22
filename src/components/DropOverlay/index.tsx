import { DropOverlaySymbolIcon } from "@/components/DropOverlay/DropOverlaySymbolIcon"
import styles from "@/components/DropOverlay/index.module.css"

export const DropOverlay = () => {
  return (
    <div className={styles.dropOverlay}>
      <span className={styles.icon}>
        <DropOverlaySymbolIcon />
      </span>
      <span className={styles.text}>ここにファイルをドロップ</span>
    </div>
  )
}
