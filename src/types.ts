export type MessageFactoryFunction = ((input: { genericName: string | null, type: string, [prop: string]: unknown }) => string)
export type MessageList = Record<string, Record<string, string | MessageFactoryFunction | Record<string, string | MessageFactoryFunction>>>

export interface ValidationError {
  name: string
  type: string
  value?: unknown
  message?: string
  [prop: string]: unknown
}

export interface MessageBoxConstructorOptions {
  escape?: RegExp
  evaluate?: RegExp
  initialLanguage?: string
  interpolate?: RegExp
  messages?: MessageList
  tracker?: TrackerLike
}

export interface GetMessageOptions {
  context?: Record<string, string>
  language?: string
}

export interface TrackerDepLike {
  changed: () => void
  depend: () => void
}

export interface TrackerLike {
  Dependency: new () => TrackerDepLike
}
