import clsx from "clsx"

import styles from "@/components/TrackList/TrackListItem/index.module.css"
import { TrackListItemAlbumIcon } from "@/components/TrackList/TrackListItem/TrackListItemAlbumIcon"
import { TrackListItemArtistIcon } from "@/components/TrackList/TrackListItem/TrackListItemArtistIcon"
import { isValidArray } from "@/utils"

type Props = {
  artworkUrl: string
  artworkThemeColor: string
  title: string
  artistList: Array<string>
  albumTitle: string
  genre: string
  release: string
  trackNumber: string
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
              <span className={clsx(styles.text, styles.maxOneLine)}>{artistText}</span>
            </div>
            <div className={styles.detail}>
              <span className={styles.icon}>
                <TrackListItemAlbumIcon />
              </span>
              <span className={clsx(styles.text, styles.maxOneLine)}>{albumTitle}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
