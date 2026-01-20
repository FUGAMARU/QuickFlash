import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import "./App.css";

const SPOTIFY_PKCE_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const SPOTIFY_PKCE_REDIRECT_URI = "http://127.0.0.1:8888/pkce";
const SPOTIFY_PKCE_SCOPES = "user-read-private user-read-email";

if (!SPOTIFY_PKCE_CLIENT_ID) {
  throw new Error("VITE_SPOTIFY_CLIENT_ID環境変数が設定されていません");
}

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authInProgress, setAuthInProgress] = useState(false);

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  async function startSpotifyAuth() {
    try {
      setAuthInProgress(true);

      // Get code_verifier and code_challenge from Rust
      const authData: any = await invoke("start_spotify_auth");

      // Build Spotify authorization URL
      const authUrl = new URL("https://accounts.spotify.com/authorize");
      authUrl.searchParams.append("client_id", SPOTIFY_PKCE_CLIENT_ID);
      authUrl.searchParams.append("response_type", "code");
      authUrl.searchParams.append("redirect_uri", SPOTIFY_PKCE_REDIRECT_URI);
      authUrl.searchParams.append("scope", SPOTIFY_PKCE_SCOPES);
      authUrl.searchParams.append("code_challenge_method", "S256");
      authUrl.searchParams.append("code_challenge", authData.code_challenge);

      const urlString = authUrl.toString();

      // Open Spotify auth page in browser
      await open(urlString);

      // Poll for access token
      pollForToken();
    } catch (error) {
      console.error("認証エラー:", error);
      alert(`Error: ${error}`);
      setAuthInProgress(false);
    }
  }

  async function pollForToken() {
    const maxAttempts = 60; // Poll for 60 seconds
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const token: string | null = await invoke("get_access_token");

        if (token) {
          setAccessToken(token);
          setAuthInProgress(false);
          clearInterval(interval);
        } else if (attempts >= maxAttempts) {
          setAuthInProgress(false);
          clearInterval(interval);
          alert("認証がタイムアウトしました。もう一度お試しください。");
        }
      } catch (error) {
        console.error("トークン取得エラー:", error);
      }
    }, 1000);
  }

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>

      <div className="row">
        <a href="https://vite.dev" target="_blank">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>
      <p>{greetMsg}</p>

      <hr style={{ margin: "20px 0" }} />

      <div>
        <h2>Spotify Authentication</h2>
        <button onClick={startSpotifyAuth} disabled={authInProgress}>
          {authInProgress ? "認証中..." : "Spotifyでサインイン"}
        </button>

        {accessToken && (
          <div style={{ marginTop: "20px" }}>
            <h3>アクセストークン:</h3>
            <textarea
              readOnly
              value={accessToken}
              style={{
                width: "100%",
                minHeight: "150px",
                fontSize: "14px",
                fontFamily: "monospace",
                padding: "15px",
                backgroundColor: "#1e1e1e",
                color: "#00ff00",
                border: "2px solid #00ff00",
                borderRadius: "5px",
                resize: "vertical",
              }}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(accessToken);
                alert("アクセストークンをクリップボードにコピーしました！");
              }}
              style={{ marginTop: "10px" }}
            >
              クリップボードにコピー
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
