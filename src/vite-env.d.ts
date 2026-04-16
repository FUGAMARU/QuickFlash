/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_AUDIO_FILE_PATH: string
  readonly VITE_SPOTIFY_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
