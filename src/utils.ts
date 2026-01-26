export const isDefined = <T>(value: T | undefined | null): value is T =>
  value !== undefined && value !== null

export const isValidString = (value: string | undefined | null): value is string =>
  isDefined(value) && typeof value === "string" && value.trim().length > 0

export const isValidArray = <T>(value: Array<T> | undefined | null): value is Array<T> =>
  isDefined(value) && value.length > 0
