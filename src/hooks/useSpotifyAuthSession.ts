import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-shell"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocalStorage } from "usehooks-ts"

import { LOCAL_STORAGE_KEY } from "@/constants/storage"
import { isDefined, isValidString } from "@/utils"
import spotifyAuthConfig from "@config/spotifyAuthConfig.json"

const SPOTIFY_PKCE_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const SPOTIFY_PKCE_REDIRECT_URI = spotifyAuthConfig.redirectUri
const SPOTIFY_PKCE_SCOPES = spotifyAuthConfig.scopes
const SPOTIFY_AUTHORIZATION_URL = "https://accounts.spotify.com/authorize"
const SPOTIFY_CURRENT_USER_PROFILE_API_URL = "https://api.spotify.com/v1/me"
const SPOTIFY_AUTH_POLL_INTERVAL_MS = 1000
const SPOTIFY_AUTH_POLL_MAX_ATTEMPTS = 60
const SPOTIFY_ACCESS_TOKEN_REFRESH_BUFFER_SECONDS = 120

type SpotifyAuthSession = {
  accessToken: string
  refreshToken: string
  expiresAtEpochSeconds: number
}

let inFlightRefreshSpotifySession: Promise<SpotifyAuthSession> | undefined

if (!isValidString(SPOTIFY_PKCE_CLIENT_ID)) {
  throw new Error("VITE_SPOTIFY_CLIENT_ID環境変数が設定されていません")
}

if (!isValidString(SPOTIFY_PKCE_REDIRECT_URI)) {
  throw new Error("spotifyAuthConfig.jsonのredirectUriが設定されていません")
}

if (!isValidString(SPOTIFY_PKCE_SCOPES)) {
  throw new Error("spotifyAuthConfig.jsonのscopesが設定されていません")
}

const toSpotifyAuthSession = (
  candidateAuthSession: Partial<SpotifyAuthSession> | undefined
): SpotifyAuthSession | undefined => {
  if (!isDefined(candidateAuthSession)) {
    return undefined
  }

  if (!isValidString(candidateAuthSession.accessToken)) {
    return undefined
  }

  if (!isValidString(candidateAuthSession.refreshToken)) {
    return undefined
  }

  if (
    typeof candidateAuthSession.expiresAtEpochSeconds !== "number" ||
    !Number.isFinite(candidateAuthSession.expiresAtEpochSeconds)
  ) {
    return undefined
  }

  return {
    accessToken: candidateAuthSession.accessToken,
    refreshToken: candidateAuthSession.refreshToken,
    expiresAtEpochSeconds: candidateAuthSession.expiresAtEpochSeconds
  }
}

const fetchSpotifyCurrentUserEmail = async (
  currentAccessToken: string
): Promise<string | undefined> => {
  try {
    const response = await fetch(SPOTIFY_CURRENT_USER_PROFILE_API_URL, {
      headers: {
        Authorization: `Bearer ${currentAccessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`status=${response.status}`)
    }

    const currentUserProfile = (await response.json()) as { email?: string | null }

    if (isValidString(currentUserProfile.email)) {
      return currentUserProfile.email
    }
  } catch {
    return undefined
  }

  return undefined
}

const waitForMilliseconds = (milliseconds: number): Promise<void> => {
  return new Promise(resolve => {
    window.setTimeout(resolve, milliseconds)
  })
}

const pollForAuthSession = async (): Promise<SpotifyAuthSession | undefined> => {
  let attempts = 0

  while (attempts < SPOTIFY_AUTH_POLL_MAX_ATTEMPTS) {
    attempts += 1

    const authSession = await invoke<SpotifyAuthSession | undefined>("get_auth_session")

    if (isDefined(authSession)) {
      return authSession
    }

    await waitForMilliseconds(SPOTIFY_AUTH_POLL_INTERVAL_MS)
  }

  return undefined
}

const requestRefreshedSpotifySession = async (
  refreshToken: string
): Promise<SpotifyAuthSession> => {
  if (isDefined(inFlightRefreshSpotifySession)) {
    return inFlightRefreshSpotifySession
  }

  const refreshRequest = invoke<SpotifyAuthSession>("refresh_spotify_access_token", {
    clientId: SPOTIFY_PKCE_CLIENT_ID,
    refreshToken
  })

  inFlightRefreshSpotifySession = refreshRequest

  try {
    return await refreshRequest
  } finally {
    inFlightRefreshSpotifySession = undefined
  }
}

const isSpotifyAccessTokenRefreshRequired = (expiresAtEpochSeconds: number): boolean => {
  const currentEpochSeconds = Math.floor(Date.now() / 1000)

  return expiresAtEpochSeconds - SPOTIFY_ACCESS_TOKEN_REFRESH_BUFFER_SECONDS <= currentEpochSeconds
}

export const useSpotifyAuthSession = () => {
  const [storedSpotifyAuthSession, setStoredSpotifyAuthSession, removeStoredSpotifyAuthSession] =
    useLocalStorage<Partial<SpotifyAuthSession> | undefined>(
      LOCAL_STORAGE_KEY.spotifyAuthSession,
      undefined
    )

  const [storedAuthSessionAtLaunch] = useState<SpotifyAuthSession | undefined>(() =>
    toSpotifyAuthSession(storedSpotifyAuthSession)
  )
  const [accessToken, setAccessToken] = useState<string | undefined>()
  const [refreshToken, setRefreshToken] = useState<string | undefined>()
  const [accessTokenExpiresAtEpochSeconds, setAccessTokenExpiresAtEpochSeconds] = useState<
    number | undefined
  >()
  const [userEmailAddress, setUserEmailAddress] = useState<string | undefined>()
  const [authInProgress, setAuthInProgress] = useState(false)
  const [isAuthBootstrapInProgress, setAuthBootstrapInProgress] = useState(true)

  const clearAuthSession = useCallback(async () => {
    setAccessToken(undefined)
    setRefreshToken(undefined)
    setAccessTokenExpiresAtEpochSeconds(undefined)
    setUserEmailAddress(undefined)
    removeStoredSpotifyAuthSession()

    try {
      await invoke("clear_auth_session")
    } catch {
      // backend側のセッション削除失敗時も、UIはサインアウト済み状態を優先する
    }
  }, [removeStoredSpotifyAuthSession])

  const onSignoutButtonClick = useCallback(() => {
    clearAuthSession()
  }, [clearAuthSession])

  const applyAuthSession = useCallback(
    async (authSession: SpotifyAuthSession) => {
      setAccessToken(authSession.accessToken)
      setRefreshToken(authSession.refreshToken)
      setAccessTokenExpiresAtEpochSeconds(authSession.expiresAtEpochSeconds)
      setStoredSpotifyAuthSession(authSession)

      const fetchedUserEmailAddress = await fetchSpotifyCurrentUserEmail(authSession.accessToken)
      setUserEmailAddress(fetchedUserEmailAddress)
    },
    [setStoredSpotifyAuthSession]
  )

  const refreshSpotifyAccessToken = useCallback(
    async (nextRefreshToken: string) => {
      try {
        const refreshedSession = await requestRefreshedSpotifySession(nextRefreshToken)
        await applyAuthSession(refreshedSession)
      } catch {
        await clearAuthSession()
      }
    },
    [applyAuthSession, clearAuthSession]
  )

  useEffect(() => {
    let isDisposed = false

    const bootstrapAuthSession = async () => {
      try {
        let bootstrapSession = storedAuthSessionAtLaunch

        if (!isDefined(bootstrapSession)) {
          const backendStoredSession = await invoke<SpotifyAuthSession | undefined>(
            "get_auth_session"
          )

          if (isDefined(backendStoredSession)) {
            bootstrapSession = backendStoredSession
          }
        }

        if (!isDefined(bootstrapSession)) {
          return
        }

        if (!isDisposed) {
          setAuthInProgress(true)

          if (isSpotifyAccessTokenRefreshRequired(bootstrapSession.expiresAtEpochSeconds)) {
            await refreshSpotifyAccessToken(bootstrapSession.refreshToken)
            return
          }

          await applyAuthSession(bootstrapSession)
        }
      } finally {
        if (!isDisposed) {
          setAuthInProgress(false)
          setAuthBootstrapInProgress(false)
        }
      }
    }

    bootstrapAuthSession()

    return () => {
      isDisposed = true
    }
  }, [applyAuthSession, refreshSpotifyAccessToken, storedAuthSessionAtLaunch])

  useEffect(() => {
    if (!isValidString(refreshToken) || !isDefined(accessTokenExpiresAtEpochSeconds)) {
      return
    }

    const currentEpochSeconds = Math.floor(Date.now() / 1000)
    const refreshDelayMilliseconds = Math.max(
      (accessTokenExpiresAtEpochSeconds -
        SPOTIFY_ACCESS_TOKEN_REFRESH_BUFFER_SECONDS -
        currentEpochSeconds) *
        1000,
      1000
    )

    const timeoutId = window.setTimeout(() => {
      refreshSpotifyAccessToken(refreshToken)
    }, refreshDelayMilliseconds)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [accessTokenExpiresAtEpochSeconds, refreshSpotifyAccessToken, refreshToken])

  const startSpotifyAuth = useCallback(async () => {
    try {
      setAuthInProgress(true)

      const authData = await invoke<{ codeChallenge: string }>("start_spotify_auth", {
        clientId: SPOTIFY_PKCE_CLIENT_ID
      })

      const authUrl = new URL(SPOTIFY_AUTHORIZATION_URL)
      authUrl.searchParams.append("client_id", SPOTIFY_PKCE_CLIENT_ID)
      authUrl.searchParams.append("response_type", "code")
      authUrl.searchParams.append("redirect_uri", SPOTIFY_PKCE_REDIRECT_URI)
      authUrl.searchParams.append("scope", SPOTIFY_PKCE_SCOPES)
      authUrl.searchParams.append("code_challenge_method", "S256")
      authUrl.searchParams.append("code_challenge", authData.codeChallenge)

      await open(authUrl.toString())

      const authSession = await pollForAuthSession()

      if (!isDefined(authSession)) {
        alert("認証がタイムアウトしました。もう一度お試しください。")
        return
      }

      await applyAuthSession(authSession)
    } catch (error) {
      alert(`エラーが発生しました: ${error}`)
      await clearAuthSession()
    } finally {
      setAuthInProgress(false)
    }
  }, [applyAuthSession, clearAuthSession])

  return useMemo(
    () => ({
      accessToken,
      authInProgress,
      isAuthBootstrapInProgress,
      onSignoutButtonClick,
      startSpotifyAuth,
      userEmailAddress
    }),
    [
      accessToken,
      authInProgress,
      isAuthBootstrapInProgress,
      onSignoutButtonClick,
      startSpotifyAuth,
      userEmailAddress
    ]
  )
}
