import styles from "@/components/TrackForm/TrackFormMetaInfo/index.module.css"
import { TrackFormMetaInfoLabel } from "@/components/TrackForm/TrackFormMetaInfo/TrackFormMetaInfoLabel"
import { TrackFormMetaInfoLoadingIcon } from "@/components/TrackForm/TrackFormMetaInfo/TrackFormMetaInfoLoadingIcon"
import { TrackFormMetaInfoPauseIcon } from "@/components/TrackForm/TrackFormMetaInfo/TrackFormMetaInfoPauseIcon"
import { TrackFormMetaInfoPlayIcon } from "@/components/TrackForm/TrackFormMetaInfo/TrackFormMetaInfoPlayIcon"

import type { TrackFormAudioFileMetaInfo } from "@/hooks/useTrackFormAudioFile"

type Props = {
  info: TrackFormAudioFileMetaInfo
  isPlaying: boolean
  isPlaybackStarting: boolean
  onPlayButtonClick: () => void
}

export const TrackFormMetaInfo = ({
  info,
  isPlaying,
  isPlaybackStarting,
  onPlayButtonClick
}: Props) => {
  return (
    <div className={styles.trackFormMetaInfo}>
      <div className={styles.left}>
        <button
          aria-busy={isPlaybackStarting}
          aria-label={
            isPlaybackStarting ? "音源を読み込み中" : isPlaying ? "音源を一時停止" : "音源を再生"
          }
          className={styles.play}
          onClick={onPlayButtonClick}
          type="button"
        >
          {isPlaybackStarting ? (
            <span className={styles.loading}>
              <TrackFormMetaInfoLoadingIcon />
            </span>
          ) : isPlaying ? (
            <TrackFormMetaInfoPauseIcon />
          ) : (
            <TrackFormMetaInfoPlayIcon />
          )}
        </button>
        <TrackFormMetaInfoLabel
          isLeftAligned
          isTextTruncated
          label="ファイル名"
          text={info.fileName}
        />
      </div>
      <div className={styles.right}>
        <TrackFormMetaInfoLabel label="音質" text={info.qualityText} />
        <TrackFormMetaInfoLabel label="再生時間" text={info.durationText} />
        <TrackFormMetaInfoLabel label="サイズ" text={info.sizeText} />
      </div>
    </div>
  )
}
