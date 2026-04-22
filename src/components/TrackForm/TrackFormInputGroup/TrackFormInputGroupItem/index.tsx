import { useId, useState } from "react"

import styles from "@/components/TrackForm/TrackFormInputGroup/TrackFormInputGroupItem/index.module.css"
import { isValidArray } from "@/utils"

type LabelValuePair = {
  label: string
  value: string
}

type Props = LabelValuePair & {
  onInput: (value: string) => void
  radioOption: Pick<LabelValuePair, "label"> & {
    itemList: Array<LabelValuePair>
  }
}

export const TrackFormInputGroupItem = ({ label, onInput, radioOption, value }: Props) => {
  const inputId = useId()
  const radioGroupName = useId()
  const hasRadioOption = isValidArray(radioOption.itemList)
  const [selectedRadioValue, setSelectedRadioValue] = useState(() =>
    hasRadioOption ? radioOption.itemList[0].value : ""
  )

  return (
    <div className={styles.trackFormInput}>
      <div className={styles.top}>
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
        {hasRadioOption && (
          <div className={styles.option}>
            <span className={styles.label}>{radioOption.label}</span>
            <div className={styles.list}>
              {radioOption.itemList.map(item => {
                const radioInputId = `${radioGroupName}-${item.value}`

                return (
                  <label key={item.value} className={styles.optionItem} htmlFor={radioInputId}>
                    <input
                      checked={selectedRadioValue === item.value}
                      className={styles.input}
                      id={radioInputId}
                      name={radioGroupName}
                      onChange={() => setSelectedRadioValue(item.value)}
                      type="radio"
                      value={item.value}
                    />
                    <span className={styles.control} />
                    <span className={styles.text}>{item.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </div>
      <input
        className={styles.input}
        id={inputId}
        onInput={e => onInput(e.currentTarget.value)}
        type="text"
        value={value}
      />
    </div>
  )
}
