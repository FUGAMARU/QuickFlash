import { useState } from "react"

import {
  ARTIST_SEPARATOR_RADIO_OPTION,
  replaceArtistSeparatorIfSafe
} from "@/components/TrackForm/index.helpers"
import styles from "@/components/TrackForm/TrackFormInputGroup/index.module.css"
import { TrackFormInputGroupItem } from "@/components/TrackForm/TrackFormInputGroup/TrackFormInputGroupItem"
import { TrackFormInputGroupSaveIcon } from "@/components/TrackForm/TrackFormInputGroup/TrackFormInputGroupSaveIcon"
import { isDefined } from "@/utils"

import type { ArtistSeparatorRadioValue } from "@/components/TrackForm/index.helpers"
import type { TrackFormAudioFileTagInfo } from "@/hooks/useTrackFormAudioFile"

const EMPTY_RADIO_OPTION = {
  label: "",
  itemList: []
}

type Props = {
  artistSeparatorRadioValue: ArtistSeparatorRadioValue
  initialValue: TrackFormAudioFileTagInfo
  onArtistSeparatorRadioValueChange: (value: ArtistSeparatorRadioValue) => void
}

export const TrackFormInputGroup = ({
  artistSeparatorRadioValue,
  initialValue,
  onArtistSeparatorRadioValueChange
}: Props) => {
  const [formValue, setFormValue] = useState(initialValue)

  const handleInput = (key: keyof TrackFormAudioFileTagInfo) => (value: string) => {
    setFormValue(current => ({
      ...current,
      [key]: value
    }))
  }

  const handleArtistSeparatorRadioValueChange = (
    nextArtistSeparatorRadioValue: ArtistSeparatorRadioValue
  ) => {
    setFormValue(current => {
      const replacedArtistText = replaceArtistSeparatorIfSafe({
        artistText: current.artist,
        currentArtistSeparatorRadioValue: artistSeparatorRadioValue,
        nextArtistSeparatorRadioValue
      })

      if (!isDefined(replacedArtistText)) {
        return current
      }

      return {
        ...current,
        artist: replacedArtistText
      }
    })

    onArtistSeparatorRadioValueChange(nextArtistSeparatorRadioValue)
  }

  return (
    <div className={styles.trackFormInputGroup}>
      <div className={styles.primary}>
        <TrackFormInputGroupItem
          label="タイトル"
          onInput={handleInput("title")}
          radioOption={EMPTY_RADIO_OPTION}
          value={formValue.title}
        />
        <TrackFormInputGroupItem
          label="アーティスト"
          onInput={handleInput("artist")}
          onRadioValueChange={handleArtistSeparatorRadioValueChange}
          radioOption={ARTIST_SEPARATOR_RADIO_OPTION}
          radioValue={artistSeparatorRadioValue}
          value={formValue.artist}
        />
        <TrackFormInputGroupItem
          label="アルバム"
          onInput={handleInput("album")}
          radioOption={EMPTY_RADIO_OPTION}
          value={formValue.album}
        />
      </div>
      <div className={styles.secondary}>
        <TrackFormInputGroupItem
          label="ジャンル"
          onInput={handleInput("genre")}
          radioOption={EMPTY_RADIO_OPTION}
          value={formValue.genre}
        />
        <TrackFormInputGroupItem
          label="リリース"
          onInput={handleInput("release")}
          radioOption={EMPTY_RADIO_OPTION}
          value={formValue.release}
        />
        <TrackFormInputGroupItem
          label="トラックナンバー"
          onInput={handleInput("trackNumber")}
          radioOption={EMPTY_RADIO_OPTION}
          value={formValue.trackNumber}
        />
      </div>

      <button className={styles.flashButton} type="button">
        <span className={styles.text}>Flash!</span>
        <span className={styles.icon}>
          <TrackFormInputGroupSaveIcon />
        </span>
      </button>
    </div>
  )
}
