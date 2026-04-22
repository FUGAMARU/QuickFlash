import styles from "@/components/TrackForm/index.module.css"
import { TrackFormInputGroup } from "@/components/TrackForm/TrackFormInputGroup"
import { TrackFormMetaInfo } from "@/components/TrackForm/TrackFormMetaInfo"

import type { ComponentProps } from "react"

type Props = Pick<
  ComponentProps<typeof TrackFormInputGroup>,
  | "artistSeparatorRadioValue"
  | "audioFilePath"
  | "flashArtworkUrl"
  | "onArtistSeparatorRadioValueChange"
  | "onFlashComplete"
> &
  Pick<
    ComponentProps<typeof TrackFormMetaInfo>,
    "info" | "isPlaybackStarting" | "isPlaying" | "onPlayButtonClick"
  > & {
    tagInfo: ComponentProps<typeof TrackFormInputGroup>["initialValue"]
    inputGroupResetSeed: number
  }

export const TrackForm = ({
  audioFilePath,
  artistSeparatorRadioValue,
  flashArtworkUrl,
  info,
  tagInfo,
  inputGroupResetSeed,
  isPlaying,
  isPlaybackStarting,
  onArtistSeparatorRadioValueChange,
  onFlashComplete,
  onPlayButtonClick
}: Props) => {
  const inputGroupResetKey = [
    audioFilePath,
    tagInfo.title,
    tagInfo.artist,
    tagInfo.album,
    tagInfo.genre,
    tagInfo.release,
    tagInfo.trackNumber,
    inputGroupResetSeed
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
        <TrackFormInputGroup
          key={inputGroupResetKey}
          artistSeparatorRadioValue={artistSeparatorRadioValue}
          audioFilePath={audioFilePath}
          flashArtworkUrl={flashArtworkUrl}
          initialValue={tagInfo}
          onArtistSeparatorRadioValueChange={onArtistSeparatorRadioValueChange}
          onFlashComplete={onFlashComplete}
        />
      </div>
    </div>
  )
}
