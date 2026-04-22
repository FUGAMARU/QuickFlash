import { useEffect } from "react"
import { useLocalStorage } from "usehooks-ts"

import {
  ARTIST_SEPARATOR_RADIO_OPTION,
  isArtistSeparatorRadioValue
} from "@/components/TrackForm/index.helpers"
import { LOCAL_STORAGE_KEY } from "@/constants/storage"

import type { ArtistSeparatorRadioValue } from "@/components/TrackForm/index.helpers"

const DEFAULT_ARTIST_SEPARATOR_RADIO_VALUE = ARTIST_SEPARATOR_RADIO_OPTION.itemList[0].value

export const useArtistSeparatorRadioValue = () => {
  const [storedArtistSeparatorRadioValue, setStoredArtistSeparatorRadioValue] =
    useLocalStorage<ArtistSeparatorRadioValue>(
      LOCAL_STORAGE_KEY.artistSeparatorRadioValue,
      DEFAULT_ARTIST_SEPARATOR_RADIO_VALUE
    )

  const artistSeparatorRadioValue = isArtistSeparatorRadioValue(storedArtistSeparatorRadioValue)
    ? storedArtistSeparatorRadioValue
    : DEFAULT_ARTIST_SEPARATOR_RADIO_VALUE

  useEffect(() => {
    if (artistSeparatorRadioValue === storedArtistSeparatorRadioValue) {
      return
    }

    setStoredArtistSeparatorRadioValue(artistSeparatorRadioValue)
  }, [
    artistSeparatorRadioValue,
    setStoredArtistSeparatorRadioValue,
    storedArtistSeparatorRadioValue
  ])

  return {
    artistSeparatorRadioValue,
    setArtistSeparatorRadioValue: setStoredArtistSeparatorRadioValue
  }
}
