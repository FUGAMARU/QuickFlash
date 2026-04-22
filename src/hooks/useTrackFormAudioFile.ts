import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core"
import { useEffect, useRef, useState } from "react"

import { getFilenameFromPath, isDefined, isValidString } from "@/utils"

type TrackFormAudioFileMetaInfoResponse = {
  artworkDataUrl: string
  durationText: string
  qualityText: string
  sizeText: string
  titleText: string
  artistText: string
  albumText: string
  genreText: string
  releaseText: string
  trackNumberText: string
}

export type TrackFormAudioFileMetaInfo = TrackFormAudioFileMetaInfoResponse & {
  fileName: string
}

export type TrackFormAudioFileTagInfo = {
  title: string
  artist: string
  album: string
  genre: string
  release: string
  trackNumber: string
}

const EMPTY_AUDIO_META_INFO = {
  artworkDataUrl: "",
  durationText: "0:00",
  qualityText: "0kHz / 0kbps",
  sizeText: "0.0MB",
  titleText: "",
  artistText: "",
  albumText: "",
  genreText: "",
  releaseText: "",
  trackNumberText: ""
} as const satisfies TrackFormAudioFileMetaInfoResponse

export const useTrackFormAudioFile = ({ audioFilePath }: { audioFilePath: string | undefined }) => {
  const isTauriEnvironment = isTauri()
  const audioPlayRef = useRef<HTMLAudioElement | null>(null)
  const hasPlayedOnceRef = useRef(false)
  const isPlaybackPendingRef = useRef(false)
  const [metaInfo, setMetaInfo] = useState<TrackFormAudioFileMetaInfoResponse>({
    ...EMPTY_AUDIO_META_INFO
  })
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackStartingFilePath, setPlaybackStartingFilePath] = useState<string | undefined>()

  const fileName = isValidString(audioFilePath) ? getFilenameFromPath(audioFilePath) : ""
  const isPlaybackStarting =
    isValidString(audioFilePath) && playbackStartingFilePath === audioFilePath
  const info = {
    ...metaInfo,
    fileName
  } satisfies TrackFormAudioFileMetaInfo
  const tagInfo = {
    title: metaInfo.titleText,
    artist: metaInfo.artistText,
    album: metaInfo.albumText,
    genre: metaInfo.genreText,
    release: metaInfo.releaseText,
    trackNumber: metaInfo.trackNumberText
  } satisfies TrackFormAudioFileTagInfo

  const clearPlaybackStartingState = () => {
    isPlaybackPendingRef.current = false
    setPlaybackStartingFilePath(undefined)
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
    setPlaybackStartingFilePath(hasPlayedOnceRef.current ? undefined : audioFilePath)

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
    tagInfo,
    isPlaying,
    isPlaybackStarting,
    onPlayButtonClick: handlePlayButtonClick
  }
}
