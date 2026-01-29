/**
 * ESLint Configuration for SigNoz Frontend
 */
module.exports = {
	ignorePatterns: ['src/parser/*.ts', 'scripts/update-registry.js'],
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
		'plugin:react-hooks/recommended',
		'plugin:prettier/recommended',
		'plugin:sonarjs/recommended',
		'plugin:react/jsx-runtime',
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: './tsconfig.json',
		ecmaFeatures: {
			jsx: true,
		},
		ecmaVersion: 2021,
		sourceType: 'module',
	},
	plugins: [
		'react', // React-specific rules
		'@typescript-eslint', // TypeScript linting
		'simple-import-sort', // Auto-sort imports
		'react-hooks', // React Hooks rules
		'prettier', // Code formatting
		'jest', // Jest test rules
		'jsx-a11y', // Accessibility rules
		'import', // Import/export linting
		'sonarjs', // Code quality/complexity
		// TODO: Uncomment after running: yarn add -D eslint-plugin-spellcheck
		// 'spellcheck', // Correct spellings
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
		// Code quality rules
		'prefer-const': 'error', // Enforces const for variables never reassigned
		'no-var': 'error', // Disallows var, enforces let/const
		'no-else-return': ['error', { allowElseIf: false }], // Reduces nesting by disallowing else after return
		'no-cond-assign': 'error', // Prevents accidental assignment in conditions (if (x = 1) instead of if (x === 1))
		'no-debugger': 'error', // Disallows debugger statements in production code
		curly: 'error', // Requires curly braces for all control statements
		eqeqeq: ['error', 'always', { null: 'ignore' }], // Enforces === and !== (allows == null for null/undefined check)
		'no-console': ['error', { allow: ['warn', 'error'] }], // Warns on console.log, allows console.warn/error

		// TypeScript rules
		'@typescript-eslint/explicit-function-return-type': 'error', // Requires explicit return types on functions
		'@typescript-eslint/no-unused-vars': [
			// Disallows unused variables/args
			'error',
			{
				argsIgnorePattern: '^_', // Allows unused args prefixed with _ (e.g., _unusedParam)
				varsIgnorePattern: '^_', // Allows unused vars prefixed with _ (e.g., _unusedVar)
			},
		],
		'@typescript-eslint/no-explicit-any': 'warn', // Warns when using 'any' type (consider upgrading to error)
		// TODO: Change to 'error' after fixing ~80 empty function placeholders in providers/contexts
		'@typescript-eslint/no-empty-function': 'off', // Disallows empty function bodies
		'@typescript-eslint/no-var-requires': 'error', // Disallows require() in TypeScript (use import instead)
		'@typescript-eslint/ban-ts-comment': 'off', // Allows @ts-ignore comments (sometimes needed for third-party libs)
		'no-empty-function': 'off', // Disabled in favor of TypeScript version above

		// React rules
		'react/jsx-filename-extension': [
			'error',
			{
				extensions: ['.tsx', '.jsx'], // Warns if JSX is used in non-.jsx/.tsx files
			},
		],
		'react/prop-types': 'off', // Disabled - using TypeScript instead
		'react/jsx-props-no-spreading': 'off', // Allows {...props} spreading (common in HOCs, forms, wrappers)
		'react/no-array-index-key': 'error', // Prevents using array index as key (causes bugs when list changes)

		// Accessibility rules
		'jsx-a11y/label-has-associated-control': [
			'error',
			{
				required: {
					some: ['nesting', 'id'], // Labels must either wrap inputs or use htmlFor/id
				},
			},
		],

		// React Hooks rules
		'react-hooks/rules-of-hooks': 'error', // Enforces Rules of Hooks (only call at top level)
		'react-hooks/exhaustive-deps': 'warn', // Warns about missing dependencies in useEffect/useMemo/useCallback

		// Import/export rules
		'import/extensions': [
			'error',
			'ignorePackages',
			{
				js: 'never', // Disallows .js extension in imports
				jsx: 'never', // Disallows .jsx extension in imports
				ts: 'never', // Disallows .ts extension in imports
				tsx: 'never', // Disallows .tsx extension in imports
			},
		],
		'import/no-extraneous-dependencies': ['error', { devDependencies: true }], // Prevents importing packages not in package.json
		// 'import/no-cycle': 'warn', // TODO: Enable later to detect circular dependencies

		// Import sorting rules
		'simple-import-sort/imports': [
			'error',
			{
				groups: [
					['^react', '^@?\\w'], // React first, then external packages
					['^@/'], // Absolute imports with @ alias
					['^\\u0000'], // Side effect imports (import './file')
					['^\\.'], // Relative imports
					['^.+\\.s?css$'], // Style imports
				],
			},
		],
		'simple-import-sort/exports': 'error', // Auto-sorts exports

		// Prettier - code formatting
		'prettier/prettier': [
			'error',
			{},
			{
				usePrettierrc: true, // Uses .prettierrc.json for formatting rules
			},
		],

		// SonarJS - code quality and complexity
		'sonarjs/no-duplicate-string': 'off', // Disabled - can be noisy (enable periodically to check)
	},
	overrides: [
		{
			files: ['src/api/generated/**/*.ts'],
			rules: {
				'@typescript-eslint/explicit-function-return-type': 'off',
				'@typescript-eslint/explicit-module-boundary-types': 'off',
				'no-nested-ternary': 'off',
				'@typescript-eslint/no-unused-vars': 'warn',
				'sonarjs/no-duplicate-string': 'off',
			},
		},
	],
};
