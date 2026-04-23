import clsx from "clsx"
import { useEffect, useRef, useState } from "react"

import { TRACK_LIST_HOVER_BG_DEBOUNCE_DELAY_MS } from "@/components/TrackList/index.helpers"
import styles from "@/components/TrackList/index.module.css"
import { TrackListItem } from "@/components/TrackList/TrackListItem"
import { TrackListItemChevronRight } from "@/components/TrackList/TrackListItem/TrackListItemChevronRight"
import { isDefined } from "@/utils"

import type { ComponentProps } from "react"

type Props = {
  itemList: Array<ComponentProps<typeof TrackListItem>>
  onItemClick: (item: ComponentProps<typeof TrackListItem>) => void
}

export const TrackList = ({ itemList, onItemClick }: Props) => {
  const hoverDebounceTimerRef = useRef<number | undefined>(undefined)
  const initialPlacementFrameRef = useRef<number | undefined>(undefined)
  const itemWrapperRefList = useRef<Array<HTMLDivElement | null>>([])
  const [hoveredBgPosition, setHoveredBgPosition] = useState<
    | {
        height: number
        offsetTop: number
      }
    | undefined
  >()
  const [isHoveredBgVisible, setIsHoveredBgVisible] = useState(false)
  const [isPreparingInitialBgPlacement, setIsPreparingInitialBgPlacement] = useState(false)
  const [isBgFixed, setIsBgFixed] = useState(false)

  const clearHoverDebounceTimer = () => {
    if (!isDefined(hoverDebounceTimerRef.current)) {
      return
    }

    window.clearTimeout(hoverDebounceTimerRef.current)
    hoverDebounceTimerRef.current = undefined
  }

  const clearInitialPlacementFrame = () => {
    if (!isDefined(initialPlacementFrameRef.current)) {
      return
    }

    window.cancelAnimationFrame(initialPlacementFrameRef.current)
    initialPlacementFrameRef.current = undefined
  }

  const updateHoveredBgPosition = (index: number) => {
    const itemWrapper = itemWrapperRefList.current[index]

    if (!isDefined(itemWrapper)) {
      return
    }

    const nextHoveredBgPosition = {
      height: itemWrapper.offsetHeight,
      offsetTop: itemWrapper.offsetTop
    }

    if (!isHoveredBgVisible) {
      clearInitialPlacementFrame()
      setIsPreparingInitialBgPlacement(true)
      setHoveredBgPosition(nextHoveredBgPosition)

      initialPlacementFrameRef.current = window.requestAnimationFrame(() => {
        setIsPreparingInitialBgPlacement(false)
        setIsHoveredBgVisible(true)
        initialPlacementFrameRef.current = undefined
      })
      return
    }

    setHoveredBgPosition(nextHoveredBgPosition)
    setIsHoveredBgVisible(true)
  }

  const handleItemMouseEnter = (index: number) => {
    if (isBgFixed) {
      return
    }

    clearHoverDebounceTimer()

    hoverDebounceTimerRef.current = window.setTimeout(() => {
      updateHoveredBgPosition(index)
      hoverDebounceTimerRef.current = undefined
    }, TRACK_LIST_HOVER_BG_DEBOUNCE_DELAY_MS)
  }

  const handleItemClick = (index: number) => {
    clearHoverDebounceTimer()
    setIsBgFixed(true)
    updateHoveredBgPosition(index)
    onItemClick(itemList[index])
  }

  const handleTrackListMouseLeave = () => {
    clearHoverDebounceTimer()

    if (isBgFixed) {
      return
    }

    clearInitialPlacementFrame()
    setIsPreparingInitialBgPlacement(false)

    setIsHoveredBgVisible(false)
  }

  useEffect(() => {
    return () => {
      clearHoverDebounceTimer()
      clearInitialPlacementFrame()
    }
  }, [])

  const hoveredBgStyle = isDefined(hoveredBgPosition)
    ? {
        height: `${hoveredBgPosition.height}px`,
        opacity: isHoveredBgVisible ? 1 : 0,
        transform: `translateY(${hoveredBgPosition.offsetTop}px)`
      }
    : undefined

  return (
    <div className={styles.trackList} onMouseLeave={handleTrackListMouseLeave}>
      {itemList.map((item, index) => (
        <div
          key={item.artworkUrl}
          ref={element => {
            itemWrapperRefList.current[index] = element
          }}
          className={styles.item}
          onClick={() => handleItemClick(index)}
          onMouseEnter={() => handleItemMouseEnter(index)}
        >
          <TrackListItem {...item} />
        </div>
      ))}
      <div
        className={clsx(styles.bg, isPreparingInitialBgPlacement && styles.OnlyFadeIn)}
        style={hoveredBgStyle}
      >
        <span className={styles.chevron}>
          <TrackListItemChevronRight />
        </span>
      </div>
    </div>
  )
}
