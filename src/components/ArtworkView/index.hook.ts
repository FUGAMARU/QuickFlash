import { useEffect, useMemo, useState } from "react"
import * as THREE from "three"

import { isDefined, isValidString } from "@/utils"

const BLANK_ARTWORK_URL = "/blank-artwork.svg"
const BLANK_ARTWORK_TEXTURE_SIZE = 2048
const ARTWORK_SIZE = 10
const ARTWORK_THICKNESS = 0.2

const createHighlightTexture = (): THREE.CanvasTexture | undefined => {
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 512

  const context = canvas.getContext("2d")
  if (!isDefined(context)) {
    return undefined
  }

  const gradient = context.createRadialGradient(256, -50, 0, 256, -50, 300)
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.45)")
  gradient.addColorStop(0.6, "rgba(255, 255, 255, 0.1)")
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)")

  context.fillStyle = gradient
  context.fillRect(0, 0, 512, 512)

  return new THREE.CanvasTexture(canvas)
}

const createAlphaTexture = (): THREE.CanvasTexture | undefined => {
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 512

  const context = canvas.getContext("2d")
  if (!isDefined(context)) {
    return undefined
  }

  const gradient = context.createLinearGradient(0, 0, 0, 512)
  gradient.addColorStop(0, "rgb(100, 100, 100)")
  gradient.addColorStop(0.6, "rgb(0, 0, 0)")

  context.fillStyle = gradient
  context.fillRect(0, 0, 512, 512)

  return new THREE.CanvasTexture(canvas)
}

const createReflectionGeometry = (): THREE.PlaneGeometry => {
  const geometry = new THREE.PlaneGeometry(ARTWORK_SIZE, ARTWORK_SIZE)
  geometry.translate(0, -ARTWORK_SIZE / 2, 0)
  return geometry
}

const prepareTexture = (texture: THREE.Texture): THREE.Texture => {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  return texture
}

const loadTexture = (loader: THREE.TextureLoader, url: string): Promise<THREE.Texture> => {
  if (url === BLANK_ARTWORK_URL) {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.decoding = "async"

      image.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = BLANK_ARTWORK_TEXTURE_SIZE
        canvas.height = BLANK_ARTWORK_TEXTURE_SIZE

        const context = canvas.getContext("2d")
        if (!isDefined(context)) {
          reject(new Error("Failed to create 2D context"))
          return
        }

        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = "high"
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.drawImage(image, 0, 0, canvas.width, canvas.height)

        const texture = new THREE.CanvasTexture(canvas)
        resolve(prepareTexture(texture))
      }

      image.src = url
    })
  }

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      texture => {
        resolve(prepareTexture(texture))
      },
      undefined,
      reject
    )
  })
}

export const useArtworkViewScene = ({ artworkUrl }: { artworkUrl: string }) => {
  const resolvedImageUrl = isValidString(artworkUrl) ? artworkUrl : BLANK_ARTWORK_URL
  const [frontTexture, setFrontTexture] = useState<THREE.Texture | undefined>()

  const highlightTexture = useMemo(() => createHighlightTexture(), [])
  const alphaTexture = useMemo(() => createAlphaTexture(), [])
  const reflectionGeometry = useMemo(() => createReflectionGeometry(), [])

  const reflectionTexture = useMemo(() => {
    if (!isDefined(frontTexture)) {
      return undefined
    }

    const texture = frontTexture.clone()
    texture.repeat.y = -1
    texture.offset.y = 1
    texture.needsUpdate = true

    return texture
  }, [frontTexture])

  useEffect(() => {
    const textureLoader = new THREE.TextureLoader()
    textureLoader.crossOrigin = "anonymous"

    let isDisposed = false

    const applyTexture = (texture: THREE.Texture) => {
      if (isDisposed) {
        texture.dispose()
        return
      }

      setFrontTexture(texture)
    }

    const clearTexture = () => {
      if (isDisposed) {
        return
      }

      setFrontTexture(undefined)
    }

    const fetchTexture = async () => {
      try {
        const texture = await loadTexture(textureLoader, resolvedImageUrl)
        applyTexture(texture)
      } catch {
        if (resolvedImageUrl === BLANK_ARTWORK_URL) {
          clearTexture()
          return
        }

        try {
          const texture = await loadTexture(textureLoader, BLANK_ARTWORK_URL)
          applyTexture(texture)
        } catch {
          clearTexture()
        }
      }
    }

    fetchTexture()

    return () => {
      isDisposed = true
    }
  }, [resolvedImageUrl])

  useEffect(() => {
    return () => {
      if (isDefined(frontTexture)) {
        frontTexture.dispose()
      }
    }
  }, [frontTexture])

  useEffect(() => {
    return () => {
      if (isDefined(reflectionTexture)) {
        reflectionTexture.dispose()
      }
    }
  }, [reflectionTexture])

  useEffect(() => {
    return () => {
      if (isDefined(highlightTexture)) {
        highlightTexture.dispose()
      }

      if (isDefined(alphaTexture)) {
        alphaTexture.dispose()
      }

      reflectionGeometry.dispose()
    }
  }, [highlightTexture, alphaTexture, reflectionGeometry])

  return {
    alphaTexture,
    artworkSize: ARTWORK_SIZE,
    artworkThickness: ARTWORK_THICKNESS,
    frontTexture,
    highlightTexture,
    reflectionGeometry,
    reflectionTexture
  }
}
