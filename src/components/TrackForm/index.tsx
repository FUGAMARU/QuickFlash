import styles from "@/components/TrackForm/index.module.css"
import { TrackFormInputGroup } from "@/components/TrackForm/TrackFormInputGroup"
import { TrackFormMetaInfo } from "@/components/TrackForm/TrackFormMetaInfo"

import type { TrackFormAudioFileMetaInfo } from "@/hooks/useTrackFormAudioFile"

type Props = {
  isPlaying: boolean
  isPlaybackStarting: boolean
  info: TrackFormAudioFileMetaInfo
  onPlayButtonClick: () => void
}

export const TrackForm = ({ info, isPlaying, isPlaybackStarting, onPlayButtonClick }: Props) => {
  return (
    <div className={styles.trackForm}>
      <div className={styles.inner}>
        <TrackFormMetaInfo
          info={info}
          isPlaybackStarting={isPlaybackStarting}
          isPlaying={isPlaying}
          onPlayButtonClick={onPlayButtonClick}
        />
        <TrackFormInputGroup />
      </div>
    </div>
  )
}
