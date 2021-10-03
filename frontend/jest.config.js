module.exports = {
	clearMocks: true,
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'cobertura', 'html', 'json-summary'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
	modulePathIgnorePatterns: ['dist'],
	moduleNameMapper: {
		'\\.(css|less)$': '<rootDir>cssMocks.ts',
	},
	notify: true,
	notifyMode: 'always',
	testMatch: ['<rootDir>/src/**/?(*.)(test).(ts|js)?(x)'],
	transform: {
		'\\.(js|jsx|ts|tsx)?$': 'babel-jest',
	},
	setupFilesAfterEnv: ['<rootDir>jest.setup.js'],
	testPathIgnorePatterns: ['/node_modules/', '/public/'],
	moduleDirectories: ['node_modules', 'src'],
};
