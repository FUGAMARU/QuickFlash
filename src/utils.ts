export const isDefined = <T>(value: T | undefined | null): value is T =>
  value !== undefined && value !== null

export const isValidString = (value: string | undefined | null): value is string =>
  isDefined(value) && typeof value === "string" && value.trim().length > 0

export const isValidArray = <T>(value: Array<T> | undefined | null): value is Array<T> =>
  isDefined(value) && value.length > 0

export const getFilenameFromPath = (filePath: string): string => {
  const filePathParts = filePath.split(/[/\\]/)
  const fileName = filePathParts[filePathParts.length - 1]

  return isValidString(fileName) ? fileName : filePath
}
