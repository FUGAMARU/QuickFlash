import { useId, useState } from "react"

import styles from "@/components/TrackForm/TrackFormInputGroup/TrackFormInputGroupItem/index.module.css"
import { isDefined } from "@/utils"

type LabelValuePair<TValue extends string = string> = {
  label: string
  value: TValue
}

type Props<TRadioValue extends string = string> = LabelValuePair & {
  onInput: (value: string) => void
  onRadioValueChange?: (value: TRadioValue) => void
  radioOption: Pick<LabelValuePair, "label"> & {
    itemList: ReadonlyArray<LabelValuePair<TRadioValue>>
  }
  radioValue?: TRadioValue
}

export const TrackFormInputGroupItem = <TRadioValue extends string = string>({
  label,
  onInput,
  onRadioValueChange,
  radioOption,
  radioValue,
  value
}: Props<TRadioValue>) => {
  const inputId = useId()
  const radioGroupName = useId()
  const hasRadioOption = radioOption.itemList.length > 0
  const [uncontrolledSelectedRadioValue, setUncontrolledSelectedRadioValue] = useState(() =>
    hasRadioOption ? radioOption.itemList[0].value : ""
  )
  const selectedRadioValue = isDefined(radioValue) ? radioValue : uncontrolledSelectedRadioValue

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
                      onChange={() => {
                        if (isDefined(onRadioValueChange)) {
                          onRadioValueChange(item.value)
                          return
                        }

                        setUncontrolledSelectedRadioValue(item.value)
                      }}
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
