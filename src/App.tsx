import { useState } from "react"

import styles from "@/App.module.css"
import { ArtworkView } from "@/components/ArtworkView"
import { DropOverlay } from "@/components/DropOverlay"
import { KeywordInput } from "@/components/KeywordInput"
import { Signin } from "@/components/Signin"
import { TrackForm } from "@/components/TrackForm"
import { TrackList } from "@/components/TrackList"
import { UserInfoLabel } from "@/components/UserInfoLabel"
import { useRightAreaMp3DropOverlay } from "@/hooks/useRightAreaMp3DropOverlay"
import { useSpotifyAuthSession } from "@/hooks/useSpotifyAuthSession"
import { useSpotifyTrackSearch } from "@/hooks/useSpotifyTrackSearch"
import { useTrackFormAudioFile } from "@/hooks/useTrackFormAudioFile"
import { isDefined, isValidString } from "@/utils"

import type { TrackFormAudioFileTagInfo } from "@/hooks/useTrackFormAudioFile"

const App = () => {
  const [searchKeyword, setSearchKeyword] = useState("")
  const [audioFilePath, setAudioFilePath] = useState<string | undefined>()
  const [selectedTrackTagInfo, setSelectedTrackTagInfo] = useState<
    | (TrackFormAudioFileTagInfo & {
        audioFilePath: string | undefined
      })
    | undefined
  >()
  const [trackFormInputResetSeed, setTrackFormInputResetSeed] = useState(0)
  const { isFileDragOver, rightAreaDragProps } = useRightAreaMp3DropOverlay({
    onMp3Drop: setAudioFilePath
  })
  const {
    accessToken,
    authInProgress,
    isAuthBootstrapInProgress,
    onSignoutButtonClick,
    startSpotifyAuth,
    userEmailAddress
  } = useSpotifyAuthSession()
  const { isSearchingTrackList, trackList } = useSpotifyTrackSearch({
    accessToken,
    searchKeyword
  })
  const { artworkUrl, info, tagInfo, isPlaying, isPlaybackStarting, onPlayButtonClick } =
    useTrackFormAudioFile({ audioFilePath })
  const isSelectedTrackTagInfoActive =
    isDefined(selectedTrackTagInfo) && selectedTrackTagInfo.audioFilePath === audioFilePath
  const trackFormTagInfo = isSelectedTrackTagInfoActive
    ? {
        album: selectedTrackTagInfo.album,
        artist: selectedTrackTagInfo.artist,
        genre: selectedTrackTagInfo.genre,
        release: selectedTrackTagInfo.release,
        title: selectedTrackTagInfo.title,
        trackNumber: selectedTrackTagInfo.trackNumber
      }
    : tagInfo

  if (isAuthBootstrapInProgress) {
    return null
  }

  if (!isValidString(accessToken)) {
    return <Signin isLoading={authInProgress} onSignInButtonClick={startSpotifyAuth} />
  }

  return (
    <main className={styles.layoutContainer}>
      <aside className={styles.sidebar}>
        <div className={styles.upper}>
          <UserInfoLabel
            emailAddress={userEmailAddress ?? ""}
            onSignoutButtonClick={onSignoutButtonClick}
          />
          <KeywordInput
            isLoading={isSearchingTrackList}
            onChange={e => setSearchKeyword(e.target.value)}
            value={searchKeyword}
          />
        </div>
        <hr className={styles.divider} />
        <div className={styles.list}>
          <TrackList
            itemList={trackList}
            onItemClick={item => {
              setSelectedTrackTagInfo({
                album: item.albumTitle,
                artist: item.artistList.join(" / "),
                audioFilePath,
                genre: item.genre,
                release: item.release,
                title: item.title,
                trackNumber: item.trackNumber
              })
              setTrackFormInputResetSeed(current => current + 1)
            }}
          />
        </div>
      </aside>
      <div className={styles.right} {...rightAreaDragProps}>
        <div className={styles.artwork}>
          <ArtworkView artworkUrl={artworkUrl} />
        </div>
        <TrackForm
          audioFilePath={audioFilePath}
          info={info}
          inputGroupResetSeed={trackFormInputResetSeed}
          isPlaybackStarting={isPlaybackStarting}
          isPlaying={isPlaying}
          onPlayButtonClick={onPlayButtonClick}
          tagInfo={trackFormTagInfo}
        />
        {isFileDragOver && (
          <div className={styles.overlay}>
            <DropOverlay />
          </div>
        )}
      </div>
    </main>
  )
}

export default App
