import { useState } from "react"

import { ARTIST_SEPARATOR_RADIO_OPTION } from "@/components/TrackForm/index.helpers"
import styles from "@/components/TrackForm/TrackFormInputGroup/index.module.css"
import { TrackFormInputGroupItem } from "@/components/TrackForm/TrackFormInputGroup/TrackFormInputGroupItem"
import { TrackFormInputGroupSaveIcon } from "@/components/TrackForm/TrackFormInputGroup/TrackFormInputGroupSaveIcon"

type FormValue = {
  title: string
  artist: string
  album: string
  genre: string
  release: string
  trackNumber: string
}

const DEFAULT_FORM_VALUE: FormValue = {
  title: "Lonely Shooter",
  artist: "ぷにぷに電機 / kamome sano",
  album: "超重力幻想",
  genre: "Future",
  release: "2024",
  trackNumber: "3"
}

const EMPTY_RADIO_OPTION = {
  label: "",
  itemList: []
}

export const TrackFormInputGroup = () => {
  const [formValue, setFormValue] = useState(DEFAULT_FORM_VALUE)

  const handleInput = (key: keyof FormValue) => (value: string) => {
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
          placeholder="タイトルを入力…"
          radioOption={EMPTY_RADIO_OPTION}
          value={formValue.title}
        />
        <TrackFormInputGroupItem
          label="アーティスト"
          onInput={handleInput("artist")}
          placeholder="アーティスト名を入力…"
          radioOption={ARTIST_SEPARATOR_RADIO_OPTION}
          value={formValue.artist}
        />
        <TrackFormInputGroupItem
          label="アルバム"
          onInput={handleInput("album")}
          placeholder="アルバム名を入力…"
          radioOption={EMPTY_RADIO_OPTION}
          value={formValue.album}
        />
      </div>
      <div className={styles.secondary}>
        <TrackFormInputGroupItem
          label="ジャンル"
          onInput={handleInput("genre")}
          placeholder="ジャンルを入力…"
          radioOption={EMPTY_RADIO_OPTION}
          value={formValue.genre}
        />
        <TrackFormInputGroupItem
          label="リリース"
          onInput={handleInput("release")}
          placeholder="リリース年を入力…"
          radioOption={EMPTY_RADIO_OPTION}
          value={formValue.release}
        />
        <TrackFormInputGroupItem
          label="トラックナンバー"
          onInput={handleInput("trackNumber")}
          placeholder="トラックナンバーを入力…"
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
