import styles from "@/components/TrackForm/index.module.css"
import { TrackFormInputGroup } from "@/components/TrackForm/TrackFormInputGroup"
import { TrackFormMetaInfo } from "@/components/TrackForm/TrackFormMetaInfo"

import type { TrackFormAudioFileMetaInfo } from "@/hooks/useTrackFormAudioFile"

type Props = {
  isPlaying: boolean
  info: TrackFormAudioFileMetaInfo
  onPlayButtonClick: () => void
}

export const TrackForm = ({ info, isPlaying, onPlayButtonClick }: Props) => {
  return (
    <div className={styles.trackForm}>
      <div className={styles.inner}>
        <TrackFormMetaInfo
          info={info}
          isPlaying={isPlaying}
          onPlayButtonClick={onPlayButtonClick}
        />
        <TrackFormInputGroup />
      </div>
    </div>
  )
}
