import { ruleTester } from './rule-tester.mjs';

const FACADE = 'src/lib/router facade';
const HISTORY = 'lib/history singleton';

await ruleTester({
	rule: 'no-direct-react-router-import',
	valid: [
		{
			name: 'facade import',
			code: "import { useAppNavigate } from 'lib/router/useAppNavigate';",
		},
		{
			name:
				'the history package itself is a version-bump concern, not a facade one',
			code: "import { createBrowserHistory } from 'history';",
		},
		{
			name: 'unrelated module whose name contains history',
			code: "import { useHistoryPanel } from 'container/HistoryPanel';",
		},
		{
			name: 'jest.mock is not an import',
			code: "jest.mock('lib/history');",
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
			name: 'react-router-dom-v5-compat',
			code: "import { useNavigate } from 'react-router-dom-v5-compat';",
			errors: [{ message: 'compat package is an implementation detail' }],
		},
		{
			name: 'lib/history default import',
			code: "import history from 'lib/history';",
			errors: [{ message: HISTORY }],
		},
		{
			name: 'lib/history require',
			code: "const history = require('lib/history').default;",
			errors: [{ message: HISTORY }],
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
				"import { Link } from 'react-router-dom';\nimport history from 'lib/history';",
			errors: [
				{ message: FACADE, line: 1 },
				{ message: HISTORY, line: 2 },
			],
		},
	],
});
