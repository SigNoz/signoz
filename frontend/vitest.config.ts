import fs from 'node:fs';
import path from 'node:path';

import { playwright } from '@vitest/browser-playwright';
import { Plugin } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig, ViteUserConfig } from 'vitest/config';

const mock = (file: string): string =>
	path.resolve(__dirname, '__mocks__', file);

const SAFE_NAVIGATE_MOCK = path.resolve(
	__dirname,
	'src/__tests__/safeNavigateMock.ts',
);
const LOG_EVENT_MOCK = path.resolve(__dirname, 'src/__tests__/logEventMock.ts');

// msw cannot intercept from inside the page without a service worker, and the
// script has to be served from the test server's origin at a path that covers
// every request. Serving it from a middleware keeps it out of `public/`, which
// vite refuses to let JavaScript import from, and which the msw handlers do
// import their i18n fixtures from.
const mswWorkerPlugin: Plugin = {
	name: 'signoz-msw-worker',
	configureServer(server) {
		server.middlewares.use('/mockServiceWorker.js', (_req, res) => {
			res.setHeader('Content-Type', 'text/javascript');
			res.setHeader('Service-Worker-Allowed', '/');
			res.end(fs.readFileSync(mock('mockServiceWorker.js'), 'utf8'));
		});
	},
};

// Vite replaces only the matched slice of the id, so every regex has to span the
// whole specifier or the replacement gets concatenated onto it.
const sharedAlias = [
	{
		find: /^.*\.(png|jpe?g|gif|svg|webp|avif|ico|bmp|tiff)$/,
		replacement: mock('fileMock.ts'),
	},
	{ find: /^.*(?<![\w-])iconAssets$/, replacement: mock('iconAssetsMock.ts') },
	{ find: /^.*(?<![\w-])useSafeNavigate$/, replacement: SAFE_NAVIGATE_MOCK },
	{ find: /^(src\/)?api\/common\/logEvent$/, replacement: LOG_EVENT_MOCK },
	{ find: /^(src\/)?constants\/env$/, replacement: mock('env.ts') },
	{ find: /^lib\/env$/, replacement: mock('lib/env.ts') },
	// The real store reaches 502 modules and every test file pays for them, while
	// the only thing asked of it is the initial state. Must precede the src-dirs
	// alias below, which would otherwise map `store` into `src/`.
	{ find: /^(src\/)?store$/, replacement: mock('storeSnapshot.ts') },
	{ find: /^redux-mock-store$/, replacement: mock('reduxMockStore.ts') },
	{ find: /^uplot$/, replacement: mock('uplotMock.ts') },
	{ find: /^motion\/react$/, replacement: mock('motionMock.tsx') },
	// Bare specifiers resolved from `src`. vite-tsconfig-paths only maps files the
	// tsconfig includes, and `src/parser/*` is excluded from it.
	{
		find:
			/^(api|AppRoutes|assets|components|constants|container|hooks|lib|mocks-server|modules|pages|parser|periscope|providers|ReactI18|schemas|store|styles|tests|types|utils)(\/.*)?$/,
		replacement: `${path.resolve(__dirname, 'src')}/$1$2`,
	},
];

const shared: ViteUserConfig = {
	// `constants/env` has to come back empty so every request goes to the test
	// origin msw is mocking. Point vite at a directory with no `.env` so a
	// developer's local API endpoint cannot leak into the tests.
	envDir: path.resolve(__dirname, '__mocks__'),
	// The msw handlers import their i18n fixtures out of `public/locales`, which
	// vite blocks while that directory is the public dir.
	publicDir: false,
	plugins: [tsconfigPaths()],
	resolve: {
		alias: sharedAlias,
	},
	optimizeDeps: {
		// CJS packages that browser mode pre-bundles. Without listing them here
		// their named and default exports come back undefined.
		//
		// The second group is reached only through a dynamic import, so vite's
		// scanner misses it and discovers it mid-run instead. That triggers a page
		// reload in the middle of a suite, which fails whatever was in flight.
		include: [
			'crypto-js/enc-hex',
			'crypto-js/hmac-sha256',
			'monaco-editor',
			'msw',
			'overlayscrollbars',
			'posthog-js',
			'react-dom/client',
			'react-helmet-async',
			'redux-mock-store/lib/index.js',
			'translation-resilience',

			'@signozhq/ui/drawer',
			'@signozhq/ui/pagination',
			'@signozhq/ui/progress',
			'@tanstack/react-table',
			'rehype-raw',
			'react-syntax-highlighter/dist/esm/styles/prism/a11y-dark',
			'react-syntax-highlighter/dist/esm/styles/prism/one-light',
			'react-syntax-highlighter/dist/esm/languages/prism/bash',
			'react-syntax-highlighter/dist/esm/languages/prism/css',
			'react-syntax-highlighter/dist/esm/languages/prism/diff',
			'react-syntax-highlighter/dist/esm/languages/prism/docker',
			'react-syntax-highlighter/dist/esm/languages/prism/elixir',
			'react-syntax-highlighter/dist/esm/languages/prism/go',
			'react-syntax-highlighter/dist/esm/languages/prism/java',
			'react-syntax-highlighter/dist/esm/languages/prism/javascript',
			'react-syntax-highlighter/dist/esm/languages/prism/json',
			'react-syntax-highlighter/dist/esm/languages/prism/jsx',
			'react-syntax-highlighter/dist/esm/languages/prism/markup',
			'react-syntax-highlighter/dist/esm/languages/prism/python',
			'react-syntax-highlighter/dist/esm/languages/prism/rust',
			'react-syntax-highlighter/dist/esm/languages/prism/sql',
			'react-syntax-highlighter/dist/esm/languages/prism/swift',
			'react-syntax-highlighter/dist/esm/languages/prism/tsx',
			'react-syntax-highlighter/dist/esm/languages/prism/typescript',
			'react-syntax-highlighter/dist/esm/languages/prism/yaml',
		],
	},
	test: {
		globals: true,
		// Browser mode defaults to min(12, cpus - 1). Above ~4 the playwright route
		// handler @vitest/browser-playwright installs per `vi.mock` is collected
		// mid-run ("route.fulfill: The object has been collected to prevent
		// unbounded heap growth") and takes the whole run with it. Wall-clock is
		// flat from 4 workers up anyway: the run is mostly one dev server.
		maxWorkers: 4,
		// The suite is written against mocks being cleared between tests.
		clearMocks: true,
		include: ['src/**/*.test.{ts,tsx}'],
		server: {
			// @grafana/data's ESM build imports react-use subpaths without a file
			// extension, which node's ESM resolver rejects. Let vite resolve it.
			deps: { inline: [/@grafana\/data/] },
		},
	},
};

export default defineConfig({
	...shared,
	plugins: [...(shared.plugins ?? []), mswWorkerPlugin],
	test: {
		...shared.test,
		setupFiles: ['./vitest.setup.ts'],
		browser: {
			enabled: true,
			headless: true,
			provider: playwright(),
			instances: [{ browser: 'chromium' }],
		},
	},
});
