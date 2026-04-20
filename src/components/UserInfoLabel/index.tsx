import { TrimmedText } from "@/components/TrimmedText"
import styles from "@/components/UserInfoLabel/index.module.css"
import { UserInfoLabelSignoutIcon } from "@/components/UserInfoLabel/UserInfoLabelSignoutIcon"

type Props = {
  emailAddress: string
  onSignoutButtonClick: () => void
}

export const UserInfoLabel = ({
  emailAddress,
  onSignoutButtonClick: handleSignoutButtonClick
}: Props) => {
  return (
    <div className={styles.userInfoLabel}>
      <span className={styles.logo}>QuickFlash</span>
      <div className={styles.user}>
        <div className={styles.dot} />
        <TrimmedText className={styles.label}>{emailAddress}</TrimmedText>
        <button className={styles.signout} onClick={handleSignoutButtonClick} type="button">
          <UserInfoLabelSignoutIcon />
        </button>
      </div>
    </div>
  )
}
