import styles from "@/components/Signin/index.module.css"
import { SigninSpotifyLogo } from "@/components/Signin/SigninSpotifyLogo"

type Props = {
  isLoading: boolean
  onSignInButtonClick: () => void | Promise<void>
}

export const Signin = ({ isLoading, onSignInButtonClick }: Props) => {
  return (
    <main className={styles.signIn}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <img className={styles.icon} src="/app-icon.png" />
          <span className={styles.text}>QuickFlash</span>
        </div>

        <hr className={styles.divider} />

        <div className={styles.lower}>
          <button
            className={styles.signInButton}
            disabled={isLoading}
            onClick={onSignInButtonClick}
            type="button"
          >
            <span className={styles.text}>Sign-In with Spotify</span>
            <span className={styles.logo}>
              <SigninSpotifyLogo />
            </span>
          </button>

          <p className={styles.note}>ご利用にはSpotifyアカウントが必要です</p>
        </div>
      </div>
    </main>
  )
}
