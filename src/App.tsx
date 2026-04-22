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
import { isValidString } from "@/utils"

const App = () => {
  const [searchKeyword, setSearchKeyword] = useState("")
  const [audioFilePath, setAudioFilePath] = useState<string | undefined>()
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
          <TrackList itemList={trackList} />
        </div>
      </aside>
      <div className={styles.right} {...rightAreaDragProps}>
        <div className={styles.artwork}>
          <ArtworkView artworkUrl={artworkUrl} />
        </div>
        <TrackForm
          audioFilePath={audioFilePath}
          info={info}
          isPlaybackStarting={isPlaybackStarting}
          isPlaying={isPlaying}
          onPlayButtonClick={onPlayButtonClick}
          tagInfo={tagInfo}
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
