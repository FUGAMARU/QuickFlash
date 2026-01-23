import { invoke } from "@tauri-apps/api/core"
import { open as openDialog } from "@tauri-apps/plugin-dialog"
import { open } from "@tauri-apps/plugin-shell"
import { useState } from "react"

import styles from "@/App.module.css"
import reactLogo from "@/assets/react.svg"

const SPOTIFY_PKCE_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const SPOTIFY_PKCE_REDIRECT_URI = "http://127.0.0.1:8888/pkce"
const SPOTIFY_PKCE_SCOPES = "user-read-private user-read-email"

if (!SPOTIFY_PKCE_CLIENT_ID) {
  throw new Error("VITE_SPOTIFY_CLIENT_ID環境変数が設定されていません")
}

function App() {
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
      <aside className={styles.sidebar}>サイドバー</aside>
      <div className={styles.right}>アートワーク・フォーム</div>
    </main>
  )
}

export default App
