import { useState } from "react"

import { ARTIST_SEPARATOR_RADIO_OPTION } from "@/components/TrackForm/index.helpers"
import styles from "@/components/TrackForm/TrackFormInputGroup/index.module.css"
import { TrackFormInputGroupItem } from "@/components/TrackForm/TrackFormInputGroup/TrackFormInputGroupItem"
import { TrackFormInputGroupSaveIcon } from "@/components/TrackForm/TrackFormInputGroup/TrackFormInputGroupSaveIcon"

import type { TrackFormAudioFileTagInfo } from "@/hooks/useTrackFormAudioFile"

const EMPTY_RADIO_OPTION = {
  label: "",
  itemList: []
}

type Props = {
  initialValue: TrackFormAudioFileTagInfo
}

export const TrackFormInputGroup = ({ initialValue }: Props) => {
  const [formValue, setFormValue] = useState(initialValue)

  const handleInput = (key: keyof TrackFormAudioFileTagInfo) => (value: string) => {
    setFormValue(current => ({
      ...current,
      [key]: value
    }))
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
          radioOption={ARTIST_SEPARATOR_RADIO_OPTION}
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
