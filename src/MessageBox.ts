import { template } from 'lodash-es'

import merge from './merge.js'
import { GetMessageOptions, MessageBoxConstructorOptions, MessageFactoryFunction, type MessageList, TrackerDepLike, TrackerLike, ValidationError } from './types.js'

// Default lodash templates regular expressions
// https://regex101.com/r/ce27tA/5
export const DEFAULT_INTERPOLATE = /{{{([^{}#][\s\S]+?)}}}/g
// https://regex101.com/r/8sRC8b/8
export const DEFAULT_ESCAPE = /{{([^{}#][\s\S]+?)}}/g
// https://regex101.com/r/ndDqxg/4
export const SUGGESTED_EVALUATE = /{{#([^{}].*?)}}/g

class MessageBox {
  static language: string | null | undefined
  static interpolate: RegExp | undefined
  static evaluate: RegExp | undefined
  static escape: RegExp | undefined
  static messages: MessageList = {}

  public language: string
  public readonly interpolate: RegExp | undefined
  public readonly evaluate: RegExp | undefined
  public readonly escape: RegExp | undefined
  public readonly messageList: MessageList
  public readonly tracker: TrackerLike | undefined
  public readonly trackerDep: TrackerDepLike | undefined

  constructor ({
    escape,
    evaluate,
    initialLanguage,
    interpolate,
    messages,
    tracker
  }: MessageBoxConstructorOptions = {}) {
    this.language = initialLanguage ?? MessageBox.language ?? 'en'
    this.messageList = messages ?? {}

    if (tracker != null) {
      this.tracker = tracker
      this.trackerDep = new tracker.Dependency()
    }

    // Template options
    this.interpolate = interpolate ?? MessageBox.interpolate ?? DEFAULT_INTERPOLATE
    this.evaluate = evaluate ?? MessageBox.evaluate
    this.escape = escape ?? MessageBox.escape ?? DEFAULT_ESCAPE
  }

  clone (): MessageBox {
    const copy = new MessageBox({
      escape: this.escape,
      evaluate: this.evaluate,
      initialLanguage: this.language,
      interpolate: this.interpolate,
      tracker: this.tracker
    })
    copy.messages(this.messageList)
    return copy
  }

  getMessages (language?: string | undefined): { messages: Record<string, string | MessageFactoryFunction | Record<string, string | MessageFactoryFunction>>, language: string } {
    if (language == null) {
      language = this.language
      if (this.trackerDep != null) this.trackerDep.depend()
    }

    const globalMessages = MessageBox.messages[language]

    let messages = this.messageList[language]
    if (messages != null) {
      if (globalMessages != null) messages = merge({}, globalMessages, messages) as Record<string, string | MessageFactoryFunction | Record<string, string | MessageFactoryFunction>>
    } else {
      messages = globalMessages
    }

    if (messages == null) throw new Error(`No messages found for language "${language}"`)

    return {
      messages,
      language
    }
  }

  message (errorInfo: ValidationError, {
    context,
    language
  }: GetMessageOptions = {}): string {
    // Error objects can optionally include a preformatted message,
    // in which case we use that.
    if (typeof errorInfo.message === 'string') return errorInfo.message

    const fieldName = errorInfo.name
    const errorType = errorInfo.type
    const genericName = MessageBox.makeNameGeneric(fieldName)

    const { messages } = this.getMessages(language)
    const messageOrMessages = messages[errorType]

    let message: string | MessageFactoryFunction | undefined
    if (typeof messageOrMessages === 'string' || typeof messageOrMessages === 'function') {
      message = messageOrMessages
    } else {
      message = genericName != null ? messageOrMessages[genericName] : undefined
      if (message == null) message = messageOrMessages._default
    }

    if (typeof message === 'string') {
      message = template(message, {
        interpolate: this.interpolate,
        evaluate: this.evaluate,
        escape: this.escape
      })
    }

    if (typeof message !== 'function') return `${fieldName} is invalid`

    return message({
      genericName,
      ...(context ?? {}),
      ...errorInfo
    })
  }

  messages (messages: MessageList): void {
    merge(this.messageList, messages)
  }

  setLanguage (language: string): void {
    this.language = language
    if (this.trackerDep != null) this.trackerDep.changed()
  }

  static makeNameGeneric (name: string | null | undefined): string | null {
    if (typeof name !== 'string') return null
    return name.replace(/\.[0-9]+(?=\.|$)/g, '.$')
  }

  static defaults ({
    escape,
    evaluate,
    initialLanguage,
    interpolate,
    messages
  }: Omit<MessageBoxConstructorOptions, 'tracker'> = {}): void {
    if (typeof initialLanguage === 'string') MessageBox.language = initialLanguage

    if (interpolate instanceof RegExp) MessageBox.interpolate = interpolate
    if (evaluate instanceof RegExp) MessageBox.evaluate = evaluate
    if (escape instanceof RegExp) MessageBox.escape = escape

    if (messages != null) {
      if (MessageBox.messages == null) MessageBox.messages = {}
      merge(MessageBox.messages, messages)
    }
  }
}

export default MessageBox
