import { useState } from "react"

import { ARTIST_SEPARATOR_RADIO_OPTION } from "@/components/TrackForm/index.helpers"
import styles from "@/components/TrackForm/index.module.css"
import { TrackFormInput } from "@/components/TrackForm/TrackFormInput"
import { TrackFormMetaInfo } from "@/components/TrackForm/TrackFormMetaInfo"

export const TrackForm = () => {
  const [artistValue, setArtistValue] = useState("ぷにぷに電機 / kamome sano")
  const audioFilePath = import.meta.env.VITE_DEV_AUDIO_FILE_PATH

  return (
    <div className={styles.trackForm}>
      <TrackFormMetaInfo audioFilePath={audioFilePath} />
      <TrackFormInput
        label="アーティスト"
        onInput={setArtistValue}
        placeholder="アーティスト名を入力…"
        radioOption={ARTIST_SEPARATOR_RADIO_OPTION}
        value={artistValue}
      />
    </div>
  )
}
