module.exports = {
	env: {
		browser: true,
		es2021: true,
		node: true,
	},
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:prettier/recommended',
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaFeatures: {
			jsx: true,
		},
		ecmaVersion: 12,
		sourceType: 'module',
	},
	plugins: [
		'react',
		'@typescript-eslint',
		'simple-import-sort',
		'react-hooks',
		'prettier',
	],
	settings: {
		react: {
			version: 'latest',
		},
	},
	rules: {
		'react/jsx-filename-extension': [
			'error',
			{
				extensions: ['.tsx', '.js', '.jsx'],
			},
		],
		'react/prop-types': 'off',
		'@typescript-eslint/explicit-function-return-type': 'error',
		'@typescript-eslint/no-var-requires': 0,
		'linebreak-style': ['error', 'unix'],

		// simple sort error
		'simple-import-sort/imports': 'error',
		'simple-import-sort/exports': 'error',

		// hooks
		'react-hooks/rules-of-hooks': 'error',
		'react-hooks/exhaustive-deps': 'warn',

		'prettier/prettier': [
			'error',
			{},
			{
				usePrettierrc: true,
			},
		],
	},
};
