module.exports = {
    root: true,
    env: {
        node: true,
    },
    extends: [
        'eslint:recommended',
        // 'vue-preset/eslint:recommended',
        'plugin:vue/essential',
        'plugin:vue/recommended',
    ],
    rules: {
        'arrow-parens': 'error',
        'brace-style': 'error',
        'camelcase': 'off',
        'comma-dangle': ['warn', 'always-multiline'],
        'comma-spacing': 'warn',
        'curly': 'error',
        'eol-last': 'error',
        'eqeqeq': ['error', 'smart'],
        'indent': [
            'error',
            4,
            {
                'FunctionExpression': { 'parameters': 'first' },
                'CallExpression': { 'arguments': 'first' }
            }
        ],
        'keyword-spacing': 'warn',
        'linebreak-style': ['error', 'unix'],
        'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'no-param-reassign': ['error', { 'props': false }],
        'no-plusplus': ['error', { 'allowForLoopAfterthoughts': true }],
        'no-underscore-dangle': 'off',
        'no-unused-vars': ['error', { 'args': 'none' }],
        'object-curly-newline': ['error', { consistent: true }],
        'prefer-template': 'error',
        'quotes': [
            'error',
            'single',
            {
                'avoidEscape': true,
                'allowTemplateLiterals': true
            }
        ],
        'semi': [
            'error',
            'always'
        ],
        'space-before-blocks': 'error',
        'space-infix-ops': 'error'
    },
    parserOptions: {
        parser: 'babel-eslint',
    },
};
