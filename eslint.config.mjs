import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

import love from 'eslint-config-love'
import simpleImportSort from 'eslint-plugin-simple-import-sort'

export default tseslint.config(
  {
    ignores: [
      'dist/**/*',
      'eslint.config.mjs'
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ...love,
    plugins: {
      'simple-import-sort': simpleImportSort
    },
    rules: {
      'simple-import-sort/imports': 'error'
    }
  }
)
