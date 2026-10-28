import { ruleTester } from './rule-tester.mjs';

const FACADE = 'src/lib/router facade';
const MOCK = 'tests/router-mocks helpers';

await ruleTester({
	rule: 'no-direct-react-router-import',
	valid: [
		{
			name: 'facade import',
			code: "import { useAppNavigate } from 'lib/router/useAppNavigate';",
		},
		{
			name: 'unrelated module whose name contains history',
			code: "import { useHistoryPanel } from 'container/HistoryPanel';",
		},
		{
			name: 'mocking a facade module',
			code: "jest.mock('lib/router/navigation');",
		},
		{
			name: 'jest call that does not name a module',
			code: 'jest.fn();',
		},
		{
			name: 'require of an unrelated module',
			code: "const x = require('lib/dashboardVariables');",
		},
		{
			name: 'export without a source',
			code: 'const a = 1;\nexport { a };',
		},
	],
	invalid: [
		{
			name: 'jest.mock of react-router-dom',
			code: "jest.mock('react-router-dom', () => ({}));",
			errors: [{ message: MOCK, line: 1, column: 11 }],
		},
		{
			name: 'jest.requireActual of react-router-dom',
			code: "const actual = jest.requireActual('react-router-dom');",
			errors: [{ message: MOCK }],
		},
		{
			name: 'jest.doMock of react-router',
			code: "jest.doMock('react-router');",
			errors: [{ message: MOCK }],
		},
		{
			name: 'react-router-dom named import',
			code: "import { useHistory } from 'react-router-dom';",
			errors: [{ message: FACADE, line: 1, column: 28 }],
		},
		{
			name: 'react-router named import',
			code: "import { useLocation } from 'react-router';",
			errors: [{ message: FACADE }],
		},
		{
			name: 'react-router-dom type-only import',
			code: "import type { RouteProps } from 'react-router-dom';",
			errors: [{ message: FACADE }],
		},
		{
			name: 'react-router-dom is flagged as the v7 re-export shim',
			code: "import { Outlet } from 'react-router-dom';",
			errors: [{ message: 'only a re-export shim' }],
		},
		{
			name: 'require',
			code: "const router = require('react-router');",
			errors: [{ message: FACADE }],
		},
		{
			name: 'dynamic import',
			code: "const mod = await import('react-router-dom');",
			errors: [{ message: FACADE }],
		},
		{
			name: 're-export',
			code: "export { Link } from 'react-router-dom';",
			errors: [{ message: FACADE }],
		},
		{
			name: 'export all',
			code: "export * from 'react-router-dom';",
			errors: [{ message: FACADE }],
		},
		{
			name: 'one report per import statement',
			code:
				"import { Link } from 'react-router';\nimport { Outlet } from 'react-router';",
			errors: [
				{ message: FACADE, line: 1 },
				{ message: FACADE, line: 2 },
			],
		},
	],
});
