module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  globals: {
    testUtils: 'readonly',
  },
  extends: ['eslint:recommended', 'plugin:node/recommended', 'prettier'],
  plugins: ['node'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    // Error prevention
    'no-console': 'off', // Allow console in server applications
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-var': 'error',
    'prefer-const': 'error',

    // Code quality
    eqeqeq: ['error', 'always'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',

    // Node.js specific
    'node/no-unpublished-require': 'off',
    'node/no-missing-import': 'off',
    'node/no-missing-require': 'off',
    'node/no-unsupported-features/es-syntax': 'off',

    // Security
    'no-unsafe-negation': 'error',
    'no-unsafe-optional-chaining': 'error',
  },
  ignorePatterns: ['node_modules/', '*.min.js', 'coverage/', 'dist/'],
};
