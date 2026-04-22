import { Vibrant } from "node-vibrant/browser"
import { useEffect, useRef, useState } from "react"

import { isDefined, isValidArray, isValidString } from "@/utils"

import type { TrackListItem } from "@/components/TrackList/TrackListItem"
import type { ComponentProps } from "react"

const SPOTIFY_TRACK_SEARCH_API_URL = "https://api.spotify.com/v1/search"
const SPOTIFY_TRACK_SEARCH_TYPE = "track"
const SPOTIFY_TRACK_SEARCH_LIMIT = 10
const SPOTIFY_TRACK_SEARCH_DEBOUNCE_DELAY_MS = 350
const TRACK_ARTWORK_THEME_COLOR_FALLBACK = "#343434"

type SpotifyTrackItem = {
  album?: {
    images?: Array<{ url?: string }>
    name?: string
    release_date?: string
  }
  artists?: Array<{ name?: string }>
  name?: string
  track_number?: number
}

type TrackListItemComponentProps = ComponentProps<typeof TrackListItem>

const artworkThemeColorCache = new Map<string, string>()

const waitForMilliseconds = (milliseconds: number): Promise<void> => {
  return new Promise(resolve => {
    window.setTimeout(resolve, milliseconds)
  })
}

const getTrackArtworkThemeColor = async (artworkUrl: string): Promise<string> => {
  if (!isValidString(artworkUrl)) {
    return TRACK_ARTWORK_THEME_COLOR_FALLBACK
  }

  const cachedArtworkThemeColor = artworkThemeColorCache.get(artworkUrl)

  if (isValidString(cachedArtworkThemeColor)) {
    return cachedArtworkThemeColor
  }

  try {
    const palette = await Vibrant.from(artworkUrl).getPalette()
    const artworkThemeColor = palette.Vibrant?.hex ?? TRACK_ARTWORK_THEME_COLOR_FALLBACK

    artworkThemeColorCache.set(artworkUrl, artworkThemeColor)
    return artworkThemeColor
  } catch {
    artworkThemeColorCache.set(artworkUrl, TRACK_ARTWORK_THEME_COLOR_FALLBACK)
    return TRACK_ARTWORK_THEME_COLOR_FALLBACK
  }
}

const toTrackListItem = async (
  spotifyTrack: SpotifyTrackItem
): Promise<TrackListItemComponentProps | undefined> => {
  const artworkUrl = spotifyTrack.album?.images?.find(image => isValidString(image.url))?.url

  if (!isValidString(artworkUrl)) {
    return undefined
  }

  const trackTitle = isValidString(spotifyTrack.name) ? spotifyTrack.name : "-"
  const albumTitle = isValidString(spotifyTrack.album?.name) ? spotifyTrack.album.name : "-"
  const release = isValidString(spotifyTrack.album?.release_date)
    ? spotifyTrack.album.release_date.split("-")[0]
    : ""
  const trackNumber =
    typeof spotifyTrack.track_number === "number" && spotifyTrack.track_number > 0
      ? `${spotifyTrack.track_number}`
      : ""
  const artistNameList = isValidArray(spotifyTrack.artists)
    ? spotifyTrack.artists.map(artist => artist.name).filter(isValidString)
    : []
  const artworkThemeColor = await getTrackArtworkThemeColor(artworkUrl)

  return {
    albumTitle,
    artistList: artistNameList,
    artworkThemeColor,
    artworkUrl,
    genre: "",
    release,
    trackNumber,
    title: trackTitle
  }
}

const searchSpotifyTrackList = async ({
  accessToken,
  searchKeyword
}: {
  accessToken: string
  searchKeyword: string
}): Promise<Array<TrackListItemComponentProps>> => {
  const searchRequestUrl = new URL(SPOTIFY_TRACK_SEARCH_API_URL)

  searchRequestUrl.searchParams.set("limit", `${SPOTIFY_TRACK_SEARCH_LIMIT}`)
  searchRequestUrl.searchParams.set("q", searchKeyword)
  searchRequestUrl.searchParams.set("type", SPOTIFY_TRACK_SEARCH_TYPE)

  const response = await fetch(searchRequestUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw new Error(`status=${response.status}`)
  }

  const responseData = (await response.json()) as {
    tracks?: {
      items?: Array<SpotifyTrackItem>
    }
  }
  const searchedSpotifyTrackList = responseData.tracks?.items

  if (!isValidArray(searchedSpotifyTrackList)) {
    return []
  }

  const trackListItemList = await Promise.all(searchedSpotifyTrackList.map(toTrackListItem))

  return trackListItemList.filter(isDefined)
}

export const useSpotifyTrackSearch = ({
  accessToken,
  searchKeyword
}: {
  accessToken: string | undefined
  searchKeyword: string
}) => {
  const [trackList, setTrackList] = useState<Array<TrackListItemComponentProps>>([])
  const [isSearchingTrackList, setIsSearchingTrackList] = useState(false)
  const searchSequenceRef = useRef(0)

  useEffect(() => {
    let isDisposed = false

    searchSequenceRef.current += 1
    const currentSearchSequence = searchSequenceRef.current

    const searchTrackList = async () => {
      const normalizedSearchKeyword = searchKeyword.trim()

      if (!isValidString(accessToken) || !isValidString(normalizedSearchKeyword)) {
        if (!isDisposed && searchSequenceRef.current === currentSearchSequence) {
          setTrackList([])
          setIsSearchingTrackList(false)
        }

        return
      }

      if (!isDisposed && searchSequenceRef.current === currentSearchSequence) {
        setIsSearchingTrackList(true)
      }

      await waitForMilliseconds(SPOTIFY_TRACK_SEARCH_DEBOUNCE_DELAY_MS)

      if (isDisposed || searchSequenceRef.current !== currentSearchSequence) {
        return
      }

      try {
        const searchedTrackList = await searchSpotifyTrackList({
          accessToken,
          searchKeyword: normalizedSearchKeyword
        })

        if (!isDisposed && searchSequenceRef.current === currentSearchSequence) {
          setTrackList(searchedTrackList)
        }
      } catch {
        if (!isDisposed && searchSequenceRef.current === currentSearchSequence) {
          setTrackList([])
        }
      } finally {
        if (!isDisposed && searchSequenceRef.current === currentSearchSequence) {
          setIsSearchingTrackList(false)
        }
      }
    }

    searchTrackList()

    return () => {
      isDisposed = true
    }
  }, [accessToken, searchKeyword])

  return {
    isSearchingTrackList,
    trackList
  }
}
