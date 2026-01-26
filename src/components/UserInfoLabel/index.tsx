import { TrimmedText } from "@/components/TrimmedText"
import styles from "@/components/UserInfoLabel/index.module.css"

type Props = {
  emailAddress: string
}

export const UserInfoLabel = ({ emailAddress }: Props) => {
  return (
    <div className={styles.userInfoLabel}>
      <div className={styles.dot} />
      <TrimmedText className={styles.label}>{emailAddress}</TrimmedText>
    </div>
  )
}
