import { isValidString } from "@/utils"

export const ARTIST_SEPARATOR_RADIO_OPTION = {
  label: "区切り文字",
  itemList: [
    {
      label: "/",
      value: "slash"
    },
    {
      label: ",",
      value: "comma"
    },
    {
      label: "・",
      value: "dot"
    }
  ]
} as const

export type ArtistSeparatorRadioValue =
  (typeof ARTIST_SEPARATOR_RADIO_OPTION.itemList)[number]["value"]

export const isArtistSeparatorRadioValue = (value: string): value is ArtistSeparatorRadioValue => {
  return ARTIST_SEPARATOR_RADIO_OPTION.itemList.some(item => item.value === value)
}

export const getArtistSeparatorText = (radioValue: ArtistSeparatorRadioValue) => {
  for (const item of ARTIST_SEPARATOR_RADIO_OPTION.itemList) {
    if (item.value === radioValue) {
      return item.label
    }
  }

  throw new Error(`未対応のアーティスト区切り文字です: ${radioValue}`)
}

export const replaceArtistSeparatorIfSafe = ({
  artistText,
  currentArtistSeparatorRadioValue,
  nextArtistSeparatorRadioValue
}: {
  artistText: string
  currentArtistSeparatorRadioValue: ArtistSeparatorRadioValue
  nextArtistSeparatorRadioValue: ArtistSeparatorRadioValue
}): string | undefined => {
  if (currentArtistSeparatorRadioValue === nextArtistSeparatorRadioValue) {
    return undefined
  }

  const currentSeparatorText = getArtistSeparatorText(currentArtistSeparatorRadioValue)

  if (!artistText.includes(currentSeparatorText)) {
    return undefined
  }

  const hasOtherSeparator = ARTIST_SEPARATOR_RADIO_OPTION.itemList
    .map(item => getArtistSeparatorText(item.value))
    .filter(separatorText => separatorText !== currentSeparatorText)
    .some(separatorText => artistText.includes(separatorText))

  if (hasOtherSeparator) {
    return undefined
  }

  const artistNameList = artistText.split(currentSeparatorText).map(text => text.trim())

  if (artistNameList.length < 2 || !artistNameList.every(isValidString)) {
    return undefined
  }

  const normalizedArtistText = artistNameList.join(currentSeparatorText)

  if (normalizedArtistText !== artistText) {
    return undefined
  }

  return artistNameList.join(getArtistSeparatorText(nextArtistSeparatorRadioValue))
}
