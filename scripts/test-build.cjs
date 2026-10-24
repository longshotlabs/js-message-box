const assert = require('node:assert/strict')

function verifyEntryPoint({ default: MessageBox, SUGGESTED_EVALUATE }) {
  const box = new MessageBox({
    evaluate: SUGGESTED_EVALUATE,
    messages: {
      en: {
        required: '{{name}} is required',
        evaluated: '{{# print("Field: ") }}{{name}}|{{{name}}}'
      }
    }
  })

  assert.equal(box.message({ name: '<name>', type: 'required' }), '&lt;name&gt; is required')
  assert.equal(box.message({ name: '<name>', type: 'evaluated' }), 'Field: &lt;name&gt;|<name>')
  assert.equal(MessageBox.makeNameGeneric('items.0.name'), 'items.$.name')
}

async function main() {
  verifyEntryPoint(require('message-box'))
  verifyEntryPoint(await import('message-box'))
  console.log('CommonJS and ESM entry points passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
