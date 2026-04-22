import styles from "@/components/TrackForm/index.module.css"
import { TrackFormInputGroup } from "@/components/TrackForm/TrackFormInputGroup"
import { TrackFormMetaInfo } from "@/components/TrackForm/TrackFormMetaInfo"

import type {
  TrackFormAudioFileTagInfo,
  TrackFormAudioFileMetaInfo
} from "@/hooks/useTrackFormAudioFile"

type Props = {
  isPlaying: boolean
  isPlaybackStarting: boolean
  audioFilePath: string | undefined
  info: TrackFormAudioFileMetaInfo
  tagInfo: TrackFormAudioFileTagInfo
  onPlayButtonClick: () => void
}

export const TrackForm = ({
  audioFilePath,
  info,
  tagInfo,
  isPlaying,
  isPlaybackStarting,
  onPlayButtonClick
}: Props) => {
  const inputGroupResetKey = [
    audioFilePath,
    tagInfo.title,
    tagInfo.artist,
    tagInfo.album,
    tagInfo.genre,
    tagInfo.release,
    tagInfo.trackNumber
  ].join("\n")

  return (
    <div className={styles.trackForm}>
      <div className={styles.inner}>
        <TrackFormMetaInfo
          info={info}
          isPlaybackStarting={isPlaybackStarting}
          isPlaying={isPlaying}
          onPlayButtonClick={onPlayButtonClick}
        />
        <TrackFormInputGroup key={inputGroupResetKey} initialValue={tagInfo} />
      </div>
    </div>
  )
}
