import { convertFileSrc, invoke } from "@tauri-apps/api/core"
import { useEffect, useRef, useState } from "react"

import styles from "@/components/TrackForm/TrackFormMetaInfo/index.module.css"
import { TrackFormMetaInfoLabel } from "@/components/TrackForm/TrackFormMetaInfo/TrackFormMetaInfoLabel"
import { TrackFormMetaInfoPauseIcon } from "@/components/TrackForm/TrackFormMetaInfo/TrackFormMetaInfoPauseIcon"
import { TrackFormMetaInfoPlayIcon } from "@/components/TrackForm/TrackFormMetaInfo/TrackFormMetaInfoPlayIcon"
import { getFilenameFromPath, isDefined } from "@/utils"

export const TrackFormMetaInfo = ({ audioFilePath }: { audioFilePath: string }) => {
  const audioPlayRef = useRef<HTMLAudioElement | null>(null)
  const [info, setInfo] = useState({
    durationText: "",
    qualityText: "",
    sizeText: ""
  })
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlayButtonClick = async () => {
    if (!isDefined(audioPlayRef.current)) {
      const audio = new Audio(convertFileSrc(audioFilePath))
      audio.preload = "auto"
      audio.onended = () => {
        setIsPlaying(false)
      }
      audioPlayRef.current = audio
    }

    const audio = audioPlayRef.current

    if (!isDefined(audio)) {
      return
    }

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      return
    }

    if (audio.ended) {
      audio.currentTime = 0
    }

    await audio.play().then(
      () => {
        setIsPlaying(true)
      },
      () => {
        setIsPlaying(false)
        alert("ファイルの再生開始に失敗しました")
      }
    )
  }

  useEffect(() => {
    void invoke<typeof info>("read_audio_file_meta_info", {
      filePath: audioFilePath
    }).then(
      metaInfo => {
        setInfo(metaInfo)
      },
      () => {
        alert("音源のメタデータの取得に失敗しました")
      }
    )

    return () => {
      if (!isDefined(audioPlayRef.current)) {
        return
      }

      audioPlayRef.current.pause()
      audioPlayRef.current.onended = null
      audioPlayRef.current.currentTime = 0
      audioPlayRef.current = null
    }
  }, [audioFilePath])

  return (
    <div className={styles.trackFormMetaInfo}>
      <div className={styles.left}>
        <button className={styles.play} onClick={handlePlayButtonClick} type="button">
          {isPlaying ? <TrackFormMetaInfoPauseIcon /> : <TrackFormMetaInfoPlayIcon />}
        </button>
        <TrackFormMetaInfoLabel
          isLeftAligned
          isTextTruncated
          label="ファイル名"
          text={getFilenameFromPath(audioFilePath)}
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
