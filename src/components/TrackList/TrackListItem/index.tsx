import clsx from "clsx"

import styles from "@/components/TrackList/TrackListItem/index.module.css"
import { TrackListItemAlbumIcon } from "@/components/TrackList/TrackListItem/TrackListItemAlbumIcon"
import { TrackListItemArtistIcon } from "@/components/TrackList/TrackListItem/TrackListItemArtistIcon"
import { TrackListItemChevronRight } from "@/components/TrackList/TrackListItem/TrackListItemChevronRight"
import { TrimmedText } from "@/components/TrimmedText"
import { isValidArray } from "@/utils"

type Props = {
  artworkUrl: string
  artworkThemeColor: string
  title: string
  artistList: Array<string>
  albumTitle: string
}

export const TrackListItem = ({
  artworkUrl,
  artworkThemeColor,
  title,
  artistList,
  albumTitle
}: Props) => {
  const artistText = isValidArray(artistList) ? artistList.join(" / ") : "-" // TODO: 区切り文字を考える

  return (
    <button className={styles.trackListItem} type="button">
      <div className={styles.artwork} style={{ backgroundColor: artworkThemeColor }}>
        <img
          alt={title}
          className={styles.image}
          decoding="async"
          loading="lazy"
          src={artworkUrl}
        />
      </div>

      <div className={styles.right}>
        <div className={styles.overview}>
          <div className={clsx(styles.title, styles.maxOneLine)}>{title}</div>
          <div className={styles.details}>
            <div className={styles.detail}>
              <span className={styles.icon}>
                <TrackListItemArtistIcon />
              </span>
              <TrimmedText className={clsx(styles.text, styles.maxOneLine)}>
                {artistText}
              </TrimmedText>
            </div>
            <div className={styles.detail}>
              <span className={styles.icon}>
                <TrackListItemAlbumIcon />
              </span>
              <TrimmedText className={clsx(styles.text, styles.maxOneLine)}>
                {albumTitle}
              </TrimmedText>
            </div>
          </div>
        </div>

        <span className={styles.chevron}>
          <TrackListItemChevronRight />
        </span>
      </div>
    </button>
  )
}
