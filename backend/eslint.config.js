const js = require('@eslint/js')
const globals = require('globals')

module.exports = [
  { ignores: ['uploads', '.donnees', 'coverage'] },
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'commonjs', globals: globals.node },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^(_|next$)', ignoreRestSiblings: true }],
    },
  },
  { files: ['tests/**/*.js'], languageOptions: { globals: { ...globals.node, ...globals.jest } } },
]
