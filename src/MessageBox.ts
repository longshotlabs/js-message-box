import merge from './merge.js'
import { GetMessageOptions, MessageBoxConstructorOptions, MessageFactoryFunction, type MessageList, TrackerDepLike, TrackerLike, ValidationError } from './types.js'

// Default lodash templates regular expressions
// https://regex101.com/r/ce27tA/5
export const DEFAULT_INTERPOLATE = /{{{([^{}#][\s\S]+?)}}}/g
// https://regex101.com/r/8sRC8b/8
export const DEFAULT_ESCAPE = /{{([^{}#][\s\S]+?)}}/g
// https://regex101.com/r/ndDqxg/4
export const SUGGESTED_EVALUATE = /{{#([^{}].*?)}}/g

// Lightweight template compiler to replace lodash-es/template
// Supports interpolate, escape, and evaluate blocks using provided regexes.
// Interpolate inserts raw text; escape inserts HTML-escaped text; evaluate runs JS code blocks.
type TemplateSettings = {
  interpolate?: RegExp
  evaluate?: RegExp
  escape?: RegExp
}

const htmlEscapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;'
}

function escapeHtml (value: unknown): string {
  const str = value == null ? '' : String(value)
  return str.replace(/[&<>"'`]/g, (ch) => htmlEscapeMap[ch])
}

const stringEscapeMap: Record<string, string> = {
  "'": "\\'",
  '\\': '\\\\',
  '\r': '\\r',
  '\n': '\\n',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029'
}

function escapeStringLiteral (str: string): string {
  return str.replace(/[\\'\r\n\u2028\u2029]/g, (ch) => stringEscapeMap[ch] ?? ch)
}

function compileTemplate (text: string, settings: TemplateSettings = {}): MessageFactoryFunction {
  const noMatch = /(.)^/
  const escape = settings.escape ?? noMatch
  const interpolate = settings.interpolate ?? noMatch
  const evaluate = settings.evaluate ?? noMatch

  const matcher = new RegExp(
    [escape.source, interpolate.source, evaluate.source].join('|') + '|$',
    'g'
  )

  let index = 0
  let source = "__p+='"

  text.replace(
    matcher,
    function (match: string, esc?: string, interp?: string, evalCode?: string, offset?: number): string {
      const off = offset as number
      source += escapeStringLiteral(text.slice(index, off))
      index = off + match.length

      if (esc !== undefined) {
        source += "'+((__t=(" + esc.trim() + "))==null?'':__e(__t))+'"
      } else if (interp !== undefined) {
        source += "'+((__t=(" + interp.trim() + "))==null?'':__t)+'"
      } else if (evalCode !== undefined) {
        source += "';" + evalCode + "\n__p+='"
      }
      return match
    }
  )

  source += "';\n"

  // Build the function body. Use `with` to allow free variable access like lodash/underscore templates.
  const functionBody =
    'var __t, __p = "";\n' +
    'var __e = escapeHtml;\n' +
    'with (obj || {}) {\n' +
    source +
    '}\n' +
    'return __p;'

  const render = new Function('obj', 'escapeHtml', functionBody) as (obj: Record<string, unknown>, escapeHtml: (v: unknown) => string) => string

  return function (input: { genericName: string | null, type: string, [prop: string]: unknown }): string {
    return render(input as Record<string, unknown>, escapeHtml)
  }
}

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
      message = compileTemplate(message, {
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
