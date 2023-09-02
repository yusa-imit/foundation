const { resolve } = require('node:path');

const project = resolve(process.cwd(), 'tsconfig.json');

/*
 * This is a custom ESLint configuration for use with
 * typescript packages.
 *
 * This config extends the Vercel Engineering Style Guide.
 * For more information, see https://github.com/vercel/style-guide
 *
 */

module.exports = {
  extends: [
    '@vercel/style-guide/eslint/node',
    '@vercel/style-guide/eslint/typescript',
  ].map(require.resolve),
  parserOptions: {
    project,
  },
  globals: {
    React: true,
    JSX: true,
  },
  settings: {
    'import/resolver': {
      typescript: {
        project,
      },
    },
  },
  rules: {
    'unicorn/filename-case': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    'no-console': 'warn',
    '@typescript-eslint/consistent-type-imports': 'off',
    'eslint-comments/no-unlimited-disable': 'off',
    'eslint-comments/disable-enable-pair': 'off',
    '@typescript-eslint/no-floating-promises': 'warn',
  },
  ignorePatterns: ['node_modules/', 'dist/'],
};
