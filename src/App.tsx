import { useState } from "react"

import styles from "@/App.module.css"
import { ArtworkView } from "@/components/ArtworkView"
import { KeywordInput } from "@/components/KeywordInput"
import { TrackForm } from "@/components/TrackForm"
import { TrackList } from "@/components/TrackList"
import { UserInfoLabel } from "@/components/UserInfoLabel"
import { useSpotifyAuthSession } from "@/hooks/useSpotifyAuthSession"
import { useSpotifyTrackSearch } from "@/hooks/useSpotifyTrackSearch"
import { useTrackFormAudioFile } from "@/hooks/useTrackFormAudioFile"
import { isValidString } from "@/utils"

import { Signin } from "@/components/Signin"

const App = () => {
  const [searchKeyword, setSearchKeyword] = useState("")
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
  const { artworkUrl, info, isPlaying, isPlaybackStarting, onPlayButtonClick } =
    useTrackFormAudioFile({
      audioFilePath: import.meta.env.VITE_DEV_AUDIO_FILE_PATH
    })

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
      <div className={styles.right}>
        <div className={styles.artwork}>
          <ArtworkView artworkUrl={artworkUrl} />
        </div>
        <TrackForm
          info={info}
          isPlaybackStarting={isPlaybackStarting}
          isPlaying={isPlaying}
          onPlayButtonClick={onPlayButtonClick}
        />
      </div>
    </main>
  )
}

export default App
