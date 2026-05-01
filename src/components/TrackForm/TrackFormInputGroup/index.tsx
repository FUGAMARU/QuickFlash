import { invoke, isTauri } from "@tauri-apps/api/core"
import clsx from "clsx"
import { useEffect, useRef, useState } from "react"

import {
  ARTIST_SEPARATOR_RADIO_OPTION,
  replaceArtistSeparatorIfSafe
} from "@/components/TrackForm/index.helpers"
import {
  FLASH_COMPLETED_RESET_DELAY_MS,
  EMPTY_RADIO_OPTION
} from "@/components/TrackForm/TrackFormInputGroup/index.helpers"
import styles from "@/components/TrackForm/TrackFormInputGroup/index.module.css"
import { TrackFormInputGroupCheckIcon } from "@/components/TrackForm/TrackFormInputGroup/TrackFormInputGroupCheckIcon"
import { TrackFormInputGroupItem } from "@/components/TrackForm/TrackFormInputGroup/TrackFormInputGroupItem"
import { TrackFormInputGroupSaveIcon } from "@/components/TrackForm/TrackFormInputGroup/TrackFormInputGroupSaveIcon"
import { isDefined, isValidString } from "@/utils"

import type { ArtistSeparatorRadioValue } from "@/components/TrackForm/index.helpers"
import type { TrackFormAudioFileTagInfo } from "@/hooks/useTrackFormAudioFile"

type Props = {
  audioFilePath: string | undefined
  artistSeparatorRadioValue: ArtistSeparatorRadioValue
  flashArtworkUrl: string | undefined
  initialValue: TrackFormAudioFileTagInfo
  onArtistSeparatorRadioValueChange: (value: ArtistSeparatorRadioValue) => void
  onFlashComplete: () => void
}

export const TrackFormInputGroup = ({
  audioFilePath,
  artistSeparatorRadioValue,
  flashArtworkUrl,
  initialValue,
  onArtistSeparatorRadioValueChange,
  onFlashComplete
}: Props) => {
  const flashCompletedResetTimerRef = useRef<number | undefined>(undefined)
  const [formValue, setFormValue] = useState(initialValue)
  const [isFlashCompleted, setIsFlashCompleted] = useState(false)
  const [isFlashing, setIsFlashing] = useState(false)

  const clearFlashCompletedResetTimer = () => {
    if (!isDefined(flashCompletedResetTimerRef.current)) {
      return
    }

    window.clearTimeout(flashCompletedResetTimerRef.current)
    flashCompletedResetTimerRef.current = undefined
  }

  const resetFlashCompleted = () => {
    setIsFlashCompleted(false)
    clearFlashCompletedResetTimer()
  }

  useEffect(() => {
    return () => {
      clearFlashCompletedResetTimer()
    }
  }, [])

  const handleInput = (key: keyof TrackFormAudioFileTagInfo, value: string) => {
    resetFlashCompleted()

    setFormValue(current => ({
      ...current,
      [key]: value
    }))
  }

  const handleArtistSeparatorRadioValueChange = (
    nextArtistSeparatorRadioValue: ArtistSeparatorRadioValue
  ) => {
    resetFlashCompleted()

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

  const handleFlashButtonClick = async () => {
    if (isFlashing || !isTauri() || !isValidString(audioFilePath)) {
      return
    }

    setIsFlashing(true)

    try {
      await invoke("write_audio_file_tag_info", {
        filePath: audioFilePath,
        tagInfo: {
          ...formValue,
          artworkUrl: flashArtworkUrl
        }
      })

      setIsFlashCompleted(true)
      clearFlashCompletedResetTimer()
      flashCompletedResetTimerRef.current = window.setTimeout(() => {
        setIsFlashCompleted(false)
        flashCompletedResetTimerRef.current = undefined
      }, FLASH_COMPLETED_RESET_DELAY_MS)
      onFlashComplete()
    } catch {
      alert("音源ファイルへのタグ書き込みに失敗しました")
    } finally {
      setIsFlashing(false)
    }
  }

  const isFlashButtonDisabled = isFlashing || !isValidString(audioFilePath)

  return (
    <div className={styles.trackFormInputGroup}>
      <div className={styles.primary}>
        <TrackFormInputGroupItem
          label="タイトル"
          onInput={value => handleInput("title", value)}
          radioOption={EMPTY_RADIO_OPTION}
          value={formValue.title}
        />
        <TrackFormInputGroupItem
          label="アーティスト"
          onInput={value => handleInput("artist", value)}
          onRadioValueChange={handleArtistSeparatorRadioValueChange}
          radioOption={ARTIST_SEPARATOR_RADIO_OPTION}
          radioValue={artistSeparatorRadioValue}
          value={formValue.artist}
        />
        <TrackFormInputGroupItem
          label="アルバム"
          onInput={value => handleInput("album", value)}
          radioOption={EMPTY_RADIO_OPTION}
          value={formValue.album}
        />
      </div>
      <div className={styles.secondary}>
        <TrackFormInputGroupItem
          label="ジャンル"
          onInput={value => handleInput("genre", value)}
          radioOption={EMPTY_RADIO_OPTION}
          value={formValue.genre}
        />
        <TrackFormInputGroupItem
          label="リリース"
          onInput={value => handleInput("release", value)}
          radioOption={EMPTY_RADIO_OPTION}
          value={formValue.release}
        />
        <TrackFormInputGroupItem
          label="トラックナンバー"
          onInput={value => handleInput("trackNumber", value)}
          radioOption={EMPTY_RADIO_OPTION}
          value={formValue.trackNumber}
        />
      </div>

      <button
        className={clsx(styles.flashButton, isFlashCompleted && styles.Completed)}
        disabled={isFlashButtonDisabled}
        onClick={handleFlashButtonClick}
        type="button"
      >
        <div className={styles.content}>
          <span className={styles.idle}>
            <span className={styles.text}>Flash!</span>
            <span className={styles.icon}>
              <TrackFormInputGroupSaveIcon />
            </span>
          </span>
          <span className={styles.done}>
            <span className={styles.check}>
              <TrackFormInputGroupCheckIcon />
            </span>
          </span>
        </div>
      </button>
    </div>
  )
}
