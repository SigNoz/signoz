import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
	clearMocks: true,
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'cobertura', 'html', 'json-summary'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
	modulePathIgnorePatterns: ['dist'],
	moduleNameMapper: {
		'\\.(css|less)$': '<rootDir>/__mocks__/cssMock.ts',
		'lodash-es': 'lodash',
	},
	testMatch: ['<rootDir>/src/**/?(*.)(test).(ts|js)?(x)'],
	transform: {
		'\\.(js|jsx|ts|tsx)?$': 'babel-jest',
	},
	setupFilesAfterEnv: ['<rootDir>jest.setup.ts'],
	testPathIgnorePatterns: ['/node_modules/', '/public/'],
	moduleDirectories: ['node_modules', 'src'],
	testEnvironment: 'jsdom',
	transformIgnorePatterns: ['<rootDir>/node_modules/(?!lodash-es)'],
};

export default config;
