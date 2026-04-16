import styles from "@/components/TrackForm/index.module.css"
import { TrackFormMetaInfo } from "@/components/TrackForm/TrackFormMetaInfo"

export const TrackForm = () => {
  return (
    <div className={styles.trackForm}>
      <TrackFormMetaInfo audioFilePath="" />
    </div>
  )
}
