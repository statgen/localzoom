module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    'plugin:vue/essential',
    '@vue/airbnb',
  ],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'indent': ['error', 4],
    'camelcase': 'off',
    'object-curly-newline': ['error', {'multiline': true}],
    'no-plusplus': ['error', {'allowForLoopAfterthoughts': true}],
    'no-param-reassign': [2, { 'props': false }],
    'no-unused-vars': ['error', { 'args': 'none' }]

  },
  parserOptions: {
    parser: 'babel-eslint',
  },
};
