import { invoke } from "@tauri-apps/api/core"
import { open as openDialog } from "@tauri-apps/plugin-dialog"
import { open } from "@tauri-apps/plugin-shell"
import { useState } from "react"

import styles from "@/App.module.css"
import { KeywordInput } from "@/components/KeywordInput"
import { TrackList } from "@/components/TrackList"
import { UserInfoLabel } from "@/components/UserInfoLabel"
import { isValidString } from "@/utils"

const SPOTIFY_PKCE_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const SPOTIFY_PKCE_REDIRECT_URI = "http://127.0.0.1:8888/pkce"
const SPOTIFY_PKCE_SCOPES = "user-read-private user-read-email"

if (!isValidString(SPOTIFY_PKCE_CLIENT_ID)) {
  throw new Error("VITE_SPOTIFY_CLIENT_ID環境変数が設定されていません")
}

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

function App() {
  const [searchKeyword, setSearchKeyword] = useState("")
  const [greetMsg, setGreetMsg] = useState("")
  const [name, setName] = useState("")
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [authInProgress, setAuthInProgress] = useState(false)
  const [mp3Title, setMp3Title] = useState<string | null>(null)
  const [mp3Error, setMp3Error] = useState<string | null>(null)

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }))
  }

  async function startSpotifyAuth() {
    try {
      setAuthInProgress(true)

      // Get code_verifier and code_challenge from Rust
      const authData: any = await invoke("start_spotify_auth")

      // Build Spotify authorization URL
      const authUrl = new URL("https://accounts.spotify.com/authorize")
      authUrl.searchParams.append("client_id", SPOTIFY_PKCE_CLIENT_ID)
      authUrl.searchParams.append("response_type", "code")
      authUrl.searchParams.append("redirect_uri", SPOTIFY_PKCE_REDIRECT_URI)
      authUrl.searchParams.append("scope", SPOTIFY_PKCE_SCOPES)
      authUrl.searchParams.append("code_challenge_method", "S256")
      authUrl.searchParams.append("code_challenge", authData.code_challenge)

      const urlString = authUrl.toString()

      // Open Spotify auth page in browser
      await open(urlString)

      // Poll for access token
      pollForToken()
    } catch (error) {
      console.error("認証エラー:", error)
      alert(`Error: ${error}`)
      setAuthInProgress(false)
    }
  }

  async function pollForToken() {
    const maxAttempts = 60 // Poll for 60 seconds
    let attempts = 0

    const interval = setInterval(async () => {
      attempts++

      try {
        const token: string | null = await invoke("get_access_token")

        if (token) {
          setAccessToken(token)
          setAuthInProgress(false)
          clearInterval(interval)
        } else if (attempts >= maxAttempts) {
          setAuthInProgress(false)
          clearInterval(interval)
          alert("認証がタイムアウトしました。もう一度お試しください。")
        }
      } catch (error) {
        console.error("トークン取得エラー:", error)
      }
    }, 1000)
  }

  async function selectMp3File() {
    try {
      setMp3Error(null)
      setMp3Title(null)

      const selected = await openDialog({
        multiple: false,
        filters: [
          {
            name: "MP3",
            extensions: ["mp3"]
          }
        ]
      })

      if (selected && typeof selected === "string") {
        const title: string = await invoke("read_mp3_title", {
          filePath: selected
        })
        setMp3Title(title)
      }
    } catch (error) {
      console.error("MP3読み取りエラー:", error)
      setMp3Error(String(error))
    }
  }

  return (
    <main className={styles.layoutContainer}>
      <aside className={styles.sidebar}>
        <div className={styles.upper}>
          <div className={styles.user}>
            <UserInfoLabel emailAddress="user@example.com" />
          </div>
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
        <div className={styles.artwork}>アートワーク</div>
        <form className={styles.form}>フォーム</form>
      </div>
    </main>
  )
}

export default App
