import { describe, it } from 'node:test'

import { expect } from 'expect'

import MessageBox, { SUGGESTED_EVALUATE } from './MessageBox.ts'
import type { MessageBoxConstructorOptions } from './types.ts'

function render(
  text: string,
  data: Record<string, unknown> = {},
  options: MessageBoxConstructorOptions = {}
): string {
  return new MessageBox({ ...options, messages: { en: { test: text } } }).message({
    name: 'items.0.name',
    type: 'test',
    ...data
  })
}

describe('message templates', () => {
  it('preserves literal quotes, backslashes, newlines, and Unicode separators', () => {
    const literal = "It's \\ a path\r\n\u2028\u2029 ` ${value}"
    expect(render(literal)).toBe(literal)
    expect(render(`${literal}{{name}}`)).toBe(`${literal}items.0.name`)
  })

  it('distinguishes escaped and raw values without escaping backticks', () => {
    expect(render('{{value}}|{{{value}}}', { value: '&<>"\'`' })).toBe(
      '&amp;&lt;&gt;&quot;&#39;`|&<>"\'`'
    )
    expect(render('{{value}}', { value: '&amp;' })).toBe('&amp;amp;')
  })

  for (const [label, value, escaped, raw] of [
    ['null', null, '', ''],
    ['undefined', undefined, '', ''],
    ['zero', 0, '0', '0'],
    ['negative zero', -0, '-0', '0'],
    ['false', false, 'false', 'false'],
    ['array', [null, undefined, -0, ['<x>']], 'null,undefined,-0,&lt;x&gt;', ',,0,<x>'],
    ['object', { toString: () => '<x>' }, '&lt;x&gt;', '<x>']
  ] as const) {
    it(`preserves ${label} conversion`, () => {
      expect(render('{{value}}|{{{value}}}', { value })).toBe(`${escaped}|${raw}`)
    })
  }

  it('escapes symbols and arrays containing symbols', () => {
    expect(render('{{value}}', { value: Symbol('<x>') })).toBe('Symbol(&lt;x&gt;)')
    expect(render('{{value}}', { value: [Symbol('<x>')] })).toBe('Symbol(&lt;x&gt;)')
    expect(() => render('{{{value}}}', { value: Symbol('x') })).toThrow(TypeError)
  })

  it('evaluates expressions using error details, context, and generic names', () => {
    const box = new MessageBox({
      messages: { en: { test: '{{label.toUpperCase()}}: {{{genericName}}} >= {{min + 1}}' } }
    })
    expect(
      box.message({ name: 'items.0.name', type: 'test', min: 2 }, { context: { label: 'name' } })
    ).toBe('NAME: items.$.name >= 3')
  })

  it('supports evaluation loops and print with multiple arguments', () => {
    expect(
      render(
        '{{# for (const item of value) { }}[{{item}}]{{# print(":", item, null, undefined) }}{{# } }}',
        { value: ['<x>', 'y'] },
        { evaluate: SUGGESTED_EVALUATE }
      )
    ).toBe('[&lt;x&gt;]:<x>[y]:y')
  })

  it('retains the default ERB evaluation delimiter and escape helper', () => {
    expect(render('<% print(_.escape(value)) %>', { value: '<x>`' })).toBe('&lt;x&gt;`')
    expect(render('{{{_.escape(value)}}}', { value: '<x>' })).toBe('&lt;x&gt;')
  })

  it('lets custom evaluation replace the default delimiter', () => {
    expect(
      render('<% print("old") %>{{# print("new") }}', {}, { evaluate: SUGGESTED_EVALUATE })
    ).toBe('<% print("old") %>new')
  })

  it('supports custom escape, interpolate, and evaluate delimiters together', () => {
    expect(
      render(
        '<% if (value) { %><%- value %>|<%= value %><% } %>',
        { value: '<x>' },
        {
          escape: /<%-([\s\S]+?)%>/g,
          interpolate: /<%=([\s\S]+?)%>/g,
          evaluate: /<%([\s\S]+?)%>/g
        }
      )
    ).toBe('&lt;x&gt;|<x>')
  })

  it('does not interpret inserted values as template code', () => {
    expect(render('{{{value}}}', { value: '{{# throw new Error() }}' })).toBe(
      '{{# throw new Error() }}'
    )
  })

  it('continues to throw on invalid expressions and unknown variables', () => {
    expect(() => render('{{value + }}')).toThrow(SyntaxError)
    expect(() => render('{{missing}}')).toThrow(ReferenceError)
  })
})
