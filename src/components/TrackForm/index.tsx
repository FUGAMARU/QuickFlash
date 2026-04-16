import styles from "@/components/TrackForm/index.module.css"
import { TrackFormInputGroup } from "@/components/TrackForm/TrackFormInputGroup"
import { TrackFormMetaInfo } from "@/components/TrackForm/TrackFormMetaInfo"

export const TrackForm = () => {
  const audioFilePath = import.meta.env.VITE_DEV_AUDIO_FILE_PATH

  return (
    <div className={styles.trackForm}>
      <div className={styles.inner}>
        <TrackFormMetaInfo audioFilePath={audioFilePath} />
        <TrackFormInputGroup />
      </div>
    </div>
  )
}
