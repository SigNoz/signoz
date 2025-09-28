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
	},
	globals: {
		extensionsToTreatAsEsm: ['.ts'],
		'ts-jest': {
			useESM: true,
			isolatedModules: true,
			tsconfig: '<rootDir>/tsconfig.jest.json',
		},
	},
	testMatch: ['<rootDir>/src/**/*?(*.)(test).(ts|js)?(x)'],
	preset: 'ts-jest/presets/js-with-ts-esm',
	transform: {
		'^.+\\.(ts|tsx)?$': 'ts-jest',
		'^.+\\.(js|jsx)$': 'babel-jest',
	},
	transformIgnorePatterns: [
		'node_modules/(?!(lodash-es|react-dnd|core-dnd|@react-dnd|dnd-core|react-dnd-html5-backend|axios|@signozhq/design-tokens|@signozhq/table|@signozhq/calendar|@signozhq/input|@signozhq/popover|@signozhq/button|@signozhq/sonner|@signozhq/*|date-fns|d3-interpolate|d3-color|api|@codemirror|@lezer|@marijn)/)',
	],
	setupFilesAfterEnv: ['<rootDir>jest.setup.ts'],
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
