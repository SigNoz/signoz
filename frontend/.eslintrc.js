module.exports = {
	env: {
		'browser': true,
		'es2021': true
	},
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/eslint-recommended',
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		'ecmaFeatures': {
			'jsx': true
		},
		'ecmaVersion': 12,
		'sourceType': 'module'
	},
	plugins: [
		'react',
		'@typescript-eslint'
	],
	rules: {
		'react/jsx-filename-extension': [
			'error',
			{
				extensions: ['.tsx', '.js', '.jsx'],
			},
		],
		'react/prop-types': 'off',
		'@typescript-eslint/explicit-function-return-type': 'error',
		'indent': [
			'error',
			'tab'
		],
		'linebreak-style': [
			'error',
			'unix'
		],
		'quotes': [
			'error',
			'single'
		],
		'semi': [
			'error',
			'always'
		]
	},
};
