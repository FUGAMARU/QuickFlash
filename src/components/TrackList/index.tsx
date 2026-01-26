import styles from "@/components/TrackList/index.module.css"
import { TrackListItem } from "@/components/TrackList/TrackListItem"

import type { ComponentProps } from "react"

type Props = {
  itemList: Array<ComponentProps<typeof TrackListItem>>
}

export const TrackList = ({ itemList }: Props) => {
  return (
    <div className={styles.trackList}>
      {itemList.map(item => (
        <TrackListItem key={item.artworkUrl} {...item} />
      ))}
    </div>
  )
}
