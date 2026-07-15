import type { Config } from '@jest/types';

const USE_SAFE_NAVIGATE_MOCK_PATH =
	'<rootDir>/src/__tests__/safeNavigateMock.ts';
const LOG_EVENT_MOCK_PATH = '<rootDir>/src/__tests__/logEventMock.ts';

const config: Config.InitialOptions = {
	silent: true,
	clearMocks: true,
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'cobertura', 'html', 'json-summary'],
	collectCoverageFrom: ['src/**/*.{ts,tsx}'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
	modulePathIgnorePatterns: ['dist'],
	moduleNameMapper: {
		'\\.(png|jpg|jpeg|gif|svg|webp|avif|ico|bmp|tiff)$':
			'<rootDir>/__mocks__/fileMock.ts',
		'^@/(.*)$': '<rootDir>/src/$1',
		'\\.(css|less|scss)$': '<rootDir>/__mocks__/cssMock.ts',
		'\\.module\\.mjs$': '<rootDir>/__mocks__/cssMock.ts',
		'\\.md$': '<rootDir>/__mocks__/cssMock.ts',
		'^uplot$': '<rootDir>/__mocks__/uplotMock.ts',
		'^motion/react$': '<rootDir>/__mocks__/motionMock.tsx',
		'^hooks/useSafeNavigate$': USE_SAFE_NAVIGATE_MOCK_PATH,
		'^src/hooks/useSafeNavigate$': USE_SAFE_NAVIGATE_MOCK_PATH,
		'^.*/useSafeNavigate$': USE_SAFE_NAVIGATE_MOCK_PATH,
		'^api/common/logEvent$': LOG_EVENT_MOCK_PATH,
		'^src/api/common/logEvent$': LOG_EVENT_MOCK_PATH,
		'^constants/env$': '<rootDir>/__mocks__/env.ts',
		'^src/constants/env$': '<rootDir>/__mocks__/env.ts',
		'^@signozhq/icons$': '<rootDir>/__mocks__/signozhqIconsMock.tsx',
		'^lib/env$': '<rootDir>/__mocks__/lib/env.ts',
		'^test-mocks/(.*)$': '<rootDir>/__mocks__/$1',
		'^react-syntax-highlighter/dist/esm/(.*)$':
			'<rootDir>/node_modules/react-syntax-highlighter/dist/cjs/$1',
		'^@signozhq/(?!ui(?:/|$))([^/]+)$':
			'<rootDir>/node_modules/@signozhq/$1/dist/$1.js',
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
	// TODO: https://github.com/SigNoz/engineering-pod/issues/5334
	transformIgnorePatterns: [
		// @chenglou/pretext is ESM-only; @signozhq/ui pulls it in via text-ellipsis.
		// Pattern 1: allow .pnpm virtual store through (handled by pattern 2), plus root-level ESM packages.
		'node_modules/(?!(\\.pnpm|lodash-es|react-dnd|core-dnd|@react-dnd|dnd-core|react-dnd-html5-backend|axios|@chenglou/pretext|@signozhq/design-tokens|@signozhq|date-fns|d3-interpolate|d3-color|api|@codemirror|@lezer|@marijn|@grafana|nuqs|uuid|copy-text-to-clipboard|react-markdown|vfile|vfile-message|unist-util-stringify-position|unified|bail|is-plain-obj|trough|remark-parse|mdast-util-from-markdown|mdast-util-to-string|micromark|micromark-core-commonmark|micromark-extension-gfm|micromark-extension-gfm-autolink-literal|micromark-extension-gfm-footnote|micromark-extension-gfm-strikethrough|micromark-extension-gfm-table|micromark-extension-gfm-tagfilter|micromark-extension-gfm-task-list-item|micromark-factory-destination|micromark-factory-label|micromark-factory-space|micromark-factory-title|micromark-factory-whitespace|micromark-util-character|micromark-util-chunked|micromark-util-classify-character|micromark-util-combine-extensions|micromark-util-decode-numeric-character-reference|micromark-util-decode-string|micromark-util-encode|micromark-util-html-tag-name|micromark-util-normalize-identifier|micromark-util-resolve-all|micromark-util-sanitize-uri|micromark-util-subtokenize|micromark-util-symbol|micromark-util-types|decode-named-character-reference|remark-rehype|mdast-util-to-hast|unist-util-position|trim-lines|unist-util-visit|unist-util-visit-parents|unist-util-is|unist-util-generated|mdast-util-definitions|property-information|hast-util-whitespace|space-separated-tokens|comma-separated-tokens|rehype-raw|hast-util-raw|hast-util-from-parse5|devlop|hastscript|hast-util-parse-selector|vfile-location|web-namespaces|hast-util-to-parse5|zwitch|html-void-elements)/)',
		// Pattern 2: pnpm virtual store — ignore everything except ESM-only packages.
		// pnpm encodes scoped packages as @scope+name@version, so match on scope prefix.
		'node_modules/\\.pnpm/(?!(lodash-es|react-dnd|core-dnd|@react-dnd|dnd-core|react-dnd-html5-backend|axios|@chenglou|@signozhq|date-fns|d3-interpolate|d3-color|api|@codemirror|@lezer|@marijn|@grafana|nuqs|uuid|copy-text-to-clipboard|react-markdown|vfile|vfile-message|unist-util-stringify-position|unified|bail|is-plain-obj|trough|remark-parse|mdast-util-from-markdown|mdast-util-to-string|micromark|decode-named-character-reference|remark-rehype|mdast-util-to-hast|unist-util-position|trim-lines|unist-util-visit|unist-util-visit-parents|unist-util-is|unist-util-generated|mdast-util-definitions|property-information|hast-util-whitespace|space-separated-tokens|comma-separated-tokens|rehype-raw|hast-util-raw|hast-util-from-parse5|devlop|hastscript|hast-util-parse-selector|vfile-location|web-namespaces|hast-util-to-parse5|zwitch|html-void-elements)[^/]*/node_modules)',
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
