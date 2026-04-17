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
  const hasPlayedOnceRef = useRef(false)
  const isPlaybackPendingRef = useRef(false)
  const [metaInfo, setMetaInfo] = useState<TrackFormAudioFileMetaInfoResponse>(() =>
    isTauriEnvironment ? { ...EMPTY_AUDIO_META_INFO } : { ...DUMMY_AUDIO_META_INFO }
  )
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackStartingFilePath, setPlaybackStartingFilePath] = useState<string | null>(null)

  const fileName = isValidString(audioFilePath) ? getFilenameFromPath(audioFilePath) : ""
  const isPlaybackStarting = isValidString(audioFilePath) && playbackStartingFilePath === audioFilePath
  const info = {
    ...metaInfo,
    fileName
  } satisfies TrackFormAudioFileMetaInfo

  const clearPlaybackStartingState = () => {
    isPlaybackPendingRef.current = false
    setPlaybackStartingFilePath(null)
  }

  const handlePlayButtonClick = () => {
    if (!isValidString(audioFilePath)) {
      return
    }

    if (!isDefined(audioPlayRef.current)) {
      const audioSource = isTauriEnvironment ? convertFileSrc(audioFilePath) : audioFilePath
      const audio = new Audio(audioSource)
      audio.preload = "auto"
      audio.onpause = () => {
        setIsPlaying(false)
        clearPlaybackStartingState()
      }
      audio.onplaying = () => {
        hasPlayedOnceRef.current = true
        setIsPlaying(true)
        clearPlaybackStartingState()
      }
      audio.onended = () => {
        setIsPlaying(false)
        clearPlaybackStartingState()
      }
      audioPlayRef.current = audio
    }

    const audio = audioPlayRef.current

    if (!isDefined(audio)) {
      return
    }

    if (isPlaybackPendingRef.current) {
      return
    }

    if (isPlaying) {
      audio.pause()
      return
    }

    if (audio.ended) {
      audio.currentTime = 0
    }

    isPlaybackPendingRef.current = true
    setPlaybackStartingFilePath(hasPlayedOnceRef.current ? null : audioFilePath)

    audio.play().catch(() => {
      clearPlaybackStartingState()
      setIsPlaying(false)
      alert("ファイルの再生開始に失敗しました")
    })
  }

  useEffect(() => {
    hasPlayedOnceRef.current = false
    isPlaybackPendingRef.current = false

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
      audioPlayRef.current.onpause = null
      audioPlayRef.current.onplaying = null
      audioPlayRef.current.onended = null
      audioPlayRef.current.currentTime = 0
      audioPlayRef.current = null
      setIsPlaying(false)
      hasPlayedOnceRef.current = false
      clearPlaybackStartingState()
    }
  }, [audioFilePath, isTauriEnvironment])

  return {
    artworkUrl: info.artworkDataUrl,
    info,
    isPlaying,
    isPlaybackStarting,
    onPlayButtonClick: handlePlayButtonClick
  }
}
