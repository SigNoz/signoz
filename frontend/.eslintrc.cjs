module.exports = {
	env: {
		browser: true,
		es2021: true,
		node: true,
		'jest/globals': true,
	},
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:prettier/recommended',
		'plugin:sonarjs/recommended',
		'plugin:import/errors',
		'plugin:import/warnings',
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
		'jest',
	],
	settings: {
		react: {
			version: 'detect',
		},
		'import/resolver': {
			node: {
				paths: ['src'],
				extensions: ['.js', '.jsx', '.ts', '.tsx'],
			},
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
		'@typescript-eslint/no-var-requires': 'error',
		'react/no-array-index-key': 'error',
		'linebreak-style': [
			'error',
			process.platform === 'win32' ? 'windows' : 'unix',
		],

		// simple sort error
		'simple-import-sort/imports': 'error',
		'simple-import-sort/exports': 'error',

		// hooks
		'react-hooks/rules-of-hooks': 'error',
		'react-hooks/exhaustive-deps': 'error',

		'prettier/prettier': [
			'error',
			{},
			{
				usePrettierrc: true,
			},
		],
	},
};
