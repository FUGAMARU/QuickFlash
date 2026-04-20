import { invoke, isTauri } from "@tauri-apps/api/core"
import { type DragDropEvent, getCurrentWebview } from "@tauri-apps/api/webview"
import { Magika } from "magika"
import { useEffect, useRef, useState } from "react"

import { isDefined, isValidString } from "@/utils"

import type { ComponentProps, DragEvent } from "react"

const UNSUPPORTED_MP3_DROP_MESSAGE = "mp3ファイルのみ対応しています"
const MP3_MIME_TYPE_SET = new Set<string>(["audio/mpeg", "audio/mp3", "audio/x-mp3"])
let inFlightMagikaClient: Promise<Magika> | undefined

const notifyWhenNotMp3 = (isMp3Detected: boolean) => {
  if (!isMp3Detected) {
    alert(UNSUPPORTED_MP3_DROP_MESSAGE)
  }
}

const isMp3MimeType = (mimeType: string | undefined | null) =>
  isValidString(mimeType) && MP3_MIME_TYPE_SET.has(mimeType.toLowerCase())

const isMp3FileName = (fileName: string | undefined | null) =>
  isValidString(fileName) && fileName.toLowerCase().endsWith(".mp3")

const getMagikaClient = () => {
  if (!isDefined(inFlightMagikaClient)) {
    inFlightMagikaClient = Magika.create()
  }

  return inFlightMagikaClient
}

const isMp3BytesByMagika = async (fileBytes: Uint8Array) => {
  const magikaClient = await getMagikaClient()
  const detectionResult = await magikaClient.identifyBytes(fileBytes)

  return detectionResult.prediction.output.label === "mp3"
}

const hasMp3WithMagikaFallback = async <Target>({
  fallbackIsMp3,
  readBytes,
  targetList
}: {
  fallbackIsMp3: (target: Target) => boolean
  readBytes: (target: Target) => Promise<Uint8Array>
  targetList: Array<Target>
}) => {
  const mp3DetectionList = await Promise.all(
    targetList.map(async target => {
      try {
        const fileBytes = await readBytes(target)

        return await isMp3BytesByMagika(fileBytes)
      } catch {
        return fallbackIsMp3(target)
      }
    })
  )

  return mp3DetectionList.some(isMp3 => isMp3)
}

const hasMp3File = (fileList: Array<File>) =>
  hasMp3WithMagikaFallback({
    fallbackIsMp3: file => isMp3MimeType(file.type) || isMp3FileName(file.name),
    readBytes: async file => new Uint8Array(await file.arrayBuffer()),
    targetList: fileList
  })

const hasMp3Path = (filePathList: Array<string>) =>
  hasMp3WithMagikaFallback({
    fallbackIsMp3: filePath => isMp3FileName(filePath),
    readBytes: async filePath => {
      const rawFileBytes = await invoke<Array<number>>("read_file_bytes", {
        filePath
      })

      return Uint8Array.from(rawFileBytes)
    },
    targetList: filePathList
  })

export const useRightAreaMp3DropOverlay = () => {
  const isTauriEnvironment = isTauri()
  const [isFileDragOver, setIsFileDragOver] = useState(false)
  const rightDragCounterRef = useRef(0)

  const syncOverlayWithCounter = () => {
    setIsFileDragOver(rightDragCounterRef.current > 0)
  }

  const clearFileDragOverlay = () => {
    rightDragCounterRef.current = 0
    syncOverlayWithCounter()
  }

  const validateDroppedFiles = (fileList: Array<File>) => {
    if (fileList.length === 0) {
      return
    }

    void (async () => {
      const isMp3Detected = await hasMp3File(fileList)

      notifyWhenNotMp3(isMp3Detected)
    })()
  }

  useEffect(() => {
    if (!isTauriEnvironment) {
      return
    }

    const clearOverlay = () => {
      rightDragCounterRef.current = 0
      setIsFileDragOver(false)
    }

    const validateDroppedNativePaths = (filePathList: Array<string>) => {
      if (filePathList.length === 0) {
        return
      }

      void (async () => {
        const isMp3Detected = await hasMp3Path(filePathList)

        notifyWhenNotMp3(isMp3Detected)
      })()
    }

    const handleNativeDragDropPayload = (payload: DragDropEvent) => {
      switch (payload.type) {
        case "leave":
          clearOverlay()
          return
        case "drop":
          validateDroppedNativePaths(payload.paths)
          clearOverlay()
          return
        case "enter":
        case "over":
          setIsFileDragOver(true)
      }
    }

    let isUnmounted = false
    let unlistenDragDropEvent: (() => void) | undefined

    getCurrentWebview()
      .onDragDropEvent(({ payload }) => {
        handleNativeDragDropPayload(payload)
      })
      .then(unlisten => {
        if (isUnmounted) {
          unlisten()
          return
        }

        unlistenDragDropEvent = unlisten
      })
      .catch(() => {
        // Fall back to DOM drag events when native subscription fails.
      })

    return () => {
      isUnmounted = true

      if (isDefined(unlistenDragDropEvent)) {
        unlistenDragDropEvent()
      }
    }
  }, [isTauriEnvironment])

  const handleRightDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    rightDragCounterRef.current += 1
    syncOverlayWithCounter()
  }

  const handleRightDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"

    if (!isFileDragOver) {
      setIsFileDragOver(true)
    }
  }

  const handleRightDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    rightDragCounterRef.current = Math.max(0, rightDragCounterRef.current - 1)
    syncOverlayWithCounter()
  }

  const handleRightDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()

    const droppedFiles = Array.from(event.dataTransfer.files ?? [])

    validateDroppedFiles(droppedFiles)

    clearFileDragOverlay()
  }

  const rightAreaDragProps = {
    onDragEnter: handleRightDragEnter,
    onDragLeave: handleRightDragLeave,
    onDragOver: handleRightDragOver,
    onDrop: handleRightDrop
  } satisfies Pick<ComponentProps<"div">, "onDragEnter" | "onDragLeave" | "onDragOver" | "onDrop">

  return {
    isFileDragOver,
    rightAreaDragProps
  }
}
