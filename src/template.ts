import type { MessageBoxConstructorOptions, MessageFactoryFunction } from './types.ts'

const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

// Match the value conversion used by Lodash's escape helper, including arrays
// containing nullish values, symbols, or negative zero.
function valueToString(value: unknown): string {
  if (Array.isArray(value)) return Array.from(value, valueToString).join(',')
  if (typeof value === 'symbol' || Object.prototype.toString.call(value) === '[object Symbol]') {
    return Symbol.prototype.toString.call(value)
  }
  const result = (value as string) + ''
  return result === '0' && 1 / (value as number) === -Infinity ? '-0' : result
}

function escapeHtml(value: unknown): string {
  const text = value == null ? '' : valueToString(value)
  return text.replace(/[&<>"']/g, (character) => htmlEntities[character])
}

/** Compile the template options exposed by MessageBox, without a runtime dependency. */
export default function template(
  text: string,
  {
    escape,
    interpolate,
    evaluate
  }: Pick<MessageBoxConstructorOptions, 'escape' | 'interpolate' | 'evaluate'>
): MessageFactoryFunction {
  // Each alternative reserves one capture for the template expression.
  const noMatch = /($^)/
  const matcher = new RegExp(
    [
      (escape ?? noMatch).source,
      (interpolate ?? noMatch).source,
      (evaluate ?? /<%([\s\S]+?)%>/g).source
    ].join('|') + '|$',
    'g'
  )
  let index = 0
  let source = '__p += '
  let isEvaluating = false
  let isEscaping = false

  text.replace(
    matcher,
    (match: string, escaped: string, interpolated: string, evaluated: string, offset: number) => {
      // JSON string literals preserve quotes, backslashes, and line breaks.
      source += JSON.stringify(text.slice(index, offset))
      if (escaped) {
        isEscaping = true
        source += ` + __e(${escaped}) + `
      }
      if (evaluated) {
        isEvaluating = true
        source += `;\n${evaluated};\n__p += `
      }
      if (interpolated) {
        source += ` + ((__t = (${interpolated})) == null ? '' : __t) + `
      }
      index = offset + match.length
      return match
    }
  )
  source += ';\n'

  // Keep the same scope and helpers as the previous compiler. Templates can
  // reference data properties directly and evaluation blocks can call print().
  const body =
    'return function(obj) {\n' +
    "var __t, __p = '';\n" +
    (isEscaping ? 'var __e = _.escape;\n' : '') +
    (isEvaluating
      ? "var __j = Array.prototype.join;\nfunction print() { __p += __j.call(arguments, '') }\n"
      : '') +
    'with (obj || {}) {\n' +
    source +
    '}\nreturn __p;\n}'

  return new Function('_', body)({ escape: escapeHtml }) as MessageFactoryFunction
}
