import { useState } from "react"

import styles from "@/App.module.css"
import { ArtworkView } from "@/components/ArtworkView"
import { KeywordInput } from "@/components/KeywordInput"
import { TrackForm } from "@/components/TrackForm"
import { TrackList } from "@/components/TrackList"
import { UserInfoLabel } from "@/components/UserInfoLabel"
import { useSpotifyAuthSession } from "@/hooks/useSpotifyAuthSession"
import { useTrackFormAudioFile } from "@/hooks/useTrackFormAudioFile"
import { isValidString } from "@/utils"

import { Signin } from "@/components/Signin"

const DUMMY_TRACK_LIST = [
  {
    artworkUrl: "https://i.scdn.co/image/ab67616d0000b273ebbee820a0fefe02ee245426",
    artworkThemeColor: "#d6aef7",
    title: "full of spells (feat. Such)",
    artistList: ["MOTTO MUSIC", "kamome sano", "Such"],
    albumTitle: "Fortune."
  },
  {
    artworkUrl: "https://i.scdn.co/image/ab67616d0000b2733309251604f357e0027f49b6",
    artworkThemeColor: "#f7a6d6",
    title: "wiz Satellite (feat. 紫崎 雪)",
    artistList: ["muyu", "紫崎雪"],
    albumTitle: "wiz Satellite"
  },
  {
    artworkUrl: "https://i.scdn.co/image/ab67616d0000b273d532a45edb59a1fa0c7cb6a0",
    artworkThemeColor: "#a6d6f7",
    title: "lovesick (feat. ぷにぷに電機)",
    artistList: ["kamome sano", "ぷにぷに電機"],
    albumTitle: "lovesick"
  },
  {
    artworkUrl: "https://i.scdn.co/image/ab67616d0000b2737487deb5121d8f09e22b90b9",
    artworkThemeColor: "#f7d6a6",
    title: "Lonely Shooter",
    artistList: ["ぷにぷに電機", "kamome sano"],
    albumTitle: "Lonely Shooter"
  },
  {
    artworkUrl: "https://i.scdn.co/image/ab67616d0000b2731a5885d3518ec63f7b51cc38",
    artworkThemeColor: "#d6f7a6",
    title: "Mewton",
    artistList: ["yuma yamaguchi", "ハル"],
    albumTitle: "Mewton"
  },
  {
    artworkUrl: "https://i.scdn.co/image/ab67616d0000b273d64811b623aa9758f9ffa240",
    artworkThemeColor: "#a6f7d6",
    title: "My medicine (feat. RANASOL)",
    artistList: ["KOTONOHOUSE", "RANASOL"],
    albumTitle: "My medicine"
  },
  {
    artworkUrl: "https://i.scdn.co/image/ab67616d0000b2737a98ebafc278c407ae126fdd",
    artworkThemeColor: "#f7a6a6",
    title: "めろめろグルーヴ",
    artistList: ["メトロミュー"],
    albumTitle: "めろめろグルーヴ"
  },
  {
    artworkUrl: "https://i.scdn.co/image/ab67616d0000b273d827218bd1f7e2b742d41aea",
    artworkThemeColor: "#a6a6f7",
    title: "haze",
    artistList: ["EMMA HAZY MINAMI", "Mikazuki BIGWAVE", "R Sound Design"],
    albumTitle: "haze"
  },
  {
    artworkUrl: "https://i.scdn.co/image/ab67616d0000b273ddf452cedc5040c81e25b5f9",
    artworkThemeColor: "#f7d6d6",
    title: "metro",
    artistList: ["EMMA HAZY MINAMI", "Mikazuki BIGWAVE", "R Sound Design"],
    albumTitle: "metro"
  },
  {
    artworkUrl: "https://i.scdn.co/image/ab67616d0000b273ffd491e847ce218c0165dc65",
    artworkThemeColor: "#d6d6f7",
    title: "After The Rain - Instrumental",
    artistList: ["Neko Hacker"],
    albumTitle: "After The Rain"
  },
  {
    artworkUrl: "https://i.scdn.co/image/ab67616d0000b2738c2829297e37a6cd8d361cae",
    artworkThemeColor: "#d6f7d6",
    title: "あやふわアスタリスク - Instrumental",
    artistList: ["DIALOGUE+"],
    albumTitle: "あやふわアスタリスク"
  },
  {
    artworkUrl: "https://i.scdn.co/image/ab67616d0000b273a2e1f7e509dccf576a4355d9",
    artworkThemeColor: "#f7a6d6",
    title: "infomorph",
    artistList: ["kamome sano"],
    albumTitle: "infomorph"
  },
  {
    artworkUrl: "https://i.scdn.co/image/ab67616d0000b2737196dcece299134bee0b766b",
    artworkThemeColor: "#a6d6d6",
    title: "スノードーム銀河 - Instrumental",
    artistList: ["mekakushe"],
    albumTitle: "スノードーム銀河"
  },
  {
    artworkUrl: "https://i.scdn.co/image/ab67616d0000b273ab006ce78fdce27696d943db",
    artworkThemeColor: "#d6a6f7",
    title: "フレンドコード",
    artistList: ["THE LUV BUGS", "Saku", "somunia"],
    albumTitle: "フレンドコード"
  },
  {
    artworkUrl: "https://i.scdn.co/image/ab67616d0000b27347b7db7f21fe1857ef89b00a",
    artworkThemeColor: "#f7d6a6",
    title: "瞬間ハートビート（Instrumental）",
    artistList: ["火威青", "音乃瀬奏", "一条莉々華", "儒烏風亭らでん", "轟はじめ", "ReGLOSS"],
    albumTitle: "瞬間ハートビート"
  },
  {
    artworkUrl: "https://i.scdn.co/image/ab67616d0000b2735fdf65245a170b190d35ac6e",
    artworkThemeColor: "#a6f7a6",
    title: "アワータイムイエロー - Instrumental",
    artistList: ["ReGLOSS"],
    albumTitle: "アワータイムイエロー"
  },
  {
    artworkUrl: "https://i.scdn.co/image/ab67616d0000b273ceea94a7231b301d6b20ce66",
    artworkThemeColor: "#d6a6d6",
    title: "メタモルフォシス - Instrumental",
    artistList: ["電音部", "Zekk", "Shinpei Nasuno", "東雲和音 (CV: 天音みほ)"],
    albumTitle: "メタモルフォシス"
  }
]

const App = () => {
  const [searchKeyword, setSearchKeyword] = useState("")
  const {
    accessToken,
    authInProgress,
    isAuthBootstrapInProgress,
    startSpotifyAuth,
    userEmailAddress
  } = useSpotifyAuthSession()
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
          <UserInfoLabel emailAddress={userEmailAddress ?? ""} />
          <KeywordInput
            isLoading
            onChange={e => setSearchKeyword(e.target.value)}
            value={searchKeyword}
          />
        </div>
        <hr className={styles.divider} />
        <div className={styles.list}>
          <TrackList itemList={DUMMY_TRACK_LIST} />
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
