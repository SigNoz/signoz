import type { Config } from '@jest/types';

const USE_SAFE_NAVIGATE_MOCK_PATH = '<rootDir>/__mocks__/useSafeNavigate.ts';

const config: Config.InitialOptions = {
	silent: true,
	clearMocks: true,
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'cobertura', 'html', 'json-summary'],
	collectCoverageFrom: ['src/**/*.{ts,tsx}'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
	modulePathIgnorePatterns: ['dist'],
	moduleNameMapper: {
		'\\.(css|less|scss)$': '<rootDir>/__mocks__/cssMock.ts',
		'\\.md$': '<rootDir>/__mocks__/cssMock.ts',
		'^uplot$': '<rootDir>/__mocks__/uplotMock.ts',
		'^hooks/useSafeNavigate$': USE_SAFE_NAVIGATE_MOCK_PATH,
		'^src/hooks/useSafeNavigate$': USE_SAFE_NAVIGATE_MOCK_PATH,
		'^.*/useSafeNavigate$': USE_SAFE_NAVIGATE_MOCK_PATH,
		'^constants/env$': '<rootDir>/__mocks__/env.ts',
		'^src/constants/env$': '<rootDir>/__mocks__/env.ts',
		'^@signozhq/icons$':
			'<rootDir>/node_modules/@signozhq/icons/dist/index.esm.js',
		'^react-syntax-highlighter/dist/esm/(.*)$':
			'<rootDir>/node_modules/react-syntax-highlighter/dist/cjs/$1',
		'^@signozhq/sonner$':
			'<rootDir>/node_modules/@signozhq/sonner/dist/sonner.js',
		'^@signozhq/button$':
			'<rootDir>/node_modules/@signozhq/button/dist/button.js',
		'^@signozhq/calendar$':
			'<rootDir>/node_modules/@signozhq/calendar/dist/calendar.js',
		'^@signozhq/badge': '<rootDir>/node_modules/@signozhq/badge/dist/badge.js',
		'^@signozhq/checkbox':
			'<rootDir>/node_modules/@signozhq/checkbox/dist/checkbox.js',
		'^@signozhq/switch': '<rootDir>/node_modules/@signozhq/switch/dist/switch.js',
		'^@signozhq/callout':
			'<rootDir>/node_modules/@signozhq/callout/dist/callout.js',
		'^@signozhq/combobox':
			'<rootDir>/node_modules/@signozhq/combobox/dist/combobox.js',
		'^@signozhq/input': '<rootDir>/node_modules/@signozhq/input/dist/input.js',
		'^@signozhq/command':
			'<rootDir>/node_modules/@signozhq/command/dist/command.js',
		'^@signozhq/radio-group':
			'<rootDir>/node_modules/@signozhq/radio-group/dist/radio-group.js',
	},
	extensionsToTreatAsEsm: ['.ts'],
	testMatch: ['<rootDir>/src/**/*?(*.)(test).(ts|js)?(x)'],
	preset: 'ts-jest/presets/js-with-ts-esm',
	transform: {
		'^.+\\.(ts|tsx)?$': [
			'ts-jest',
			{
				useESM: true,
				tsconfig: '<rootDir>/tsconfig.jest.json',
			},
		],
		'^.+\\.(js|jsx)$': 'babel-jest',
	},
	transformIgnorePatterns: [
		'node_modules/(?!(lodash-es|react-dnd|core-dnd|@react-dnd|dnd-core|react-dnd-html5-backend|axios|@signozhq/design-tokens|@signozhq/table|@signozhq/calendar|@signozhq/input|@signozhq/popover|@signozhq/button|@signozhq/sonner|@signozhq/*|date-fns|d3-interpolate|d3-color|api|@codemirror|@lezer|@marijn|@grafana)/)',
	],
	setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
	testPathIgnorePatterns: ['/node_modules/', '/public/'],
	moduleDirectories: ['node_modules', 'src'],
	testEnvironment: 'jest-environment-jsdom',
	coverageThreshold: {
		global: {
			statements: 80,
			branches: 65,
			functions: 80,
			lines: 80,
		},
	},
};

export default config;
