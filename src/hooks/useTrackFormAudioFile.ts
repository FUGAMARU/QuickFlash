import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core"
import { useEffect, useRef, useState } from "react"

import { getFilenameFromPath, isDefined, isValidString } from "@/utils"

type TrackFormAudioFileMetaInfoResponse = {
  artworkDataUrl: string
  durationText: string
  qualityText: string
  sizeText: string
}

export type TrackFormAudioFileMetaInfo = TrackFormAudioFileMetaInfoResponse & {
  fileName: string
}

const EMPTY_AUDIO_META_INFO = {
  artworkDataUrl: "",
  durationText: "",
  qualityText: "",
  sizeText: ""
} as const satisfies TrackFormAudioFileMetaInfoResponse

const DUMMY_AUDIO_META_INFO = {
  artworkDataUrl: "",
  durationText: "03:42",
  qualityText: "44.1kHz / 320kbps",
  sizeText: "8.7MB"
} as const satisfies TrackFormAudioFileMetaInfoResponse

export const useTrackFormAudioFile = ({ audioFilePath }: { audioFilePath: string }) => {
  const isTauriEnvironment = isTauri()
  const audioPlayRef = useRef<HTMLAudioElement | null>(null)
  const [metaInfo, setMetaInfo] = useState<TrackFormAudioFileMetaInfoResponse>(() =>
    isTauriEnvironment ? { ...EMPTY_AUDIO_META_INFO } : { ...DUMMY_AUDIO_META_INFO }
  )
  const [isPlaying, setIsPlaying] = useState(false)

  const fileName = isValidString(audioFilePath) ? getFilenameFromPath(audioFilePath) : ""
  const info = {
    ...metaInfo,
    fileName
  } satisfies TrackFormAudioFileMetaInfo

  const handlePlayButtonClick = () => {
    if (!isValidString(audioFilePath)) {
      return
    }

    if (!isDefined(audioPlayRef.current)) {
      const audioSource = isTauriEnvironment ? convertFileSrc(audioFilePath) : audioFilePath
      const audio = new Audio(audioSource)
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

    audio.play().then(
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
    if (isTauriEnvironment && isValidString(audioFilePath)) {
      invoke<TrackFormAudioFileMetaInfoResponse>("read_audio_file_meta_info", {
        filePath: audioFilePath
      }).then(
        metaInfo => {
          setMetaInfo(metaInfo)
        },
        () => {
          setMetaInfo({ ...EMPTY_AUDIO_META_INFO })
          alert("音源のメタデータの取得に失敗しました")
        }
      )
    }

    return () => {
      if (!isDefined(audioPlayRef.current)) {
        return
      }

      audioPlayRef.current.pause()
      audioPlayRef.current.onended = null
      audioPlayRef.current.currentTime = 0
      audioPlayRef.current = null
      setIsPlaying(false)
    }
  }, [audioFilePath, isTauriEnvironment])

  return {
    artworkUrl: info.artworkDataUrl,
    info,
    isPlaying,
    onPlayButtonClick: handlePlayButtonClick
  }
}
