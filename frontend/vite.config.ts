import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import type { Plugin, TransformResult, UserConfig } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import vitePluginChecker from 'vite-plugin-checker';
import viteCompression from 'vite-plugin-compression';
import type {
	Appcues,
	Posthog,
	Pylon,
	Sentry,
	WebSettings,
} from 'types/generated/webSettings';
import { injectChunkImportMap } from './vite-plugins/injectChunkImportMap';
import { vendorChunkName } from './vite-plugins/vendorChunkName';

// In dev the Go backend is not involved, so replace the [[.BaseHref]] placeholder
// with the configured base path so relative assets resolve correctly from the Vite dev server.
// Set VITE_BASE_PATH env var to test with a custom base path (e.g., /signoz/).
function devBasePathPlugin(basePath: string): Plugin {
	return {
		name: 'dev-base-path',
		apply: 'serve',
		transformIndexHtml(html): string {
			return html.replaceAll('[[.BaseHref]]', basePath);
		},
	};
}

function devBootDataPlugin(env: ImportMetaEnv): Plugin {
	return {
		name: 'dev-boot-data',
		apply: 'serve',
		transformIndexHtml(html): string {
			const settings = {
				posthog: {
					enabled: env.VITE_POSTHOG_ENABLED === 'true',
					apiHost: env.VITE_POSTHOG_API_HOST || '',
					key: env.VITE_POSTHOG_KEY || '',
					uiHost: env.VITE_POSTHOG_UI_HOST || '',
				} satisfies Required<Posthog>,
				appcues: {
					enabled: env.VITE_APPCUES_ENABLED === 'true',
					appId: env.VITE_APPCUES_APP_ID || '',
				} satisfies Required<Appcues>,
				sentry: {
					enabled: env.VITE_SENTRY_ENABLED === 'true',
					dsn: env.VITE_SENTRY_DSN || '',
					tunnel: env.VITE_SENTRY_TUNNEL || '',
				} satisfies Required<Sentry>,
				pylon: {
					enabled: env.VITE_PYLON_ENABLED === 'true',
					appId: env.VITE_PYLON_APP_ID || '',
					identitySecret: env.VITE_PYLON_IDENTITY_SECRET || '',
				} satisfies Required<Pylon>,
			} satisfies Required<WebSettings>;
			return html.replaceAll('[[.Settings]]', JSON.stringify(settings));
		},
	};
}

function rawMarkdownPlugin(): Plugin {
	return {
		name: 'raw-markdown',
		transform(code, id): TransformResult | undefined {
			if (!id.endsWith('.md')) {
				return undefined;
			}
			return {
				code: `export default ${JSON.stringify(code)};`,
				map: null,
			};
		},
	};
}

// Monaco contributions that need a provider SigNoz never registers. monaco-editor
// declares no `sideEffects`, so its bare imports keep all of them.
const MONACO_UNUSED_CONTRIBS = [
	'codelens',
	'dropOrPasteInto',
	'gpu',
	'inlayHints',
	'inlineCompletions',
	'linkedEditing',
	'parameterHints',
	'rename',
	'sectionHeaders',
	'semanticTokens',
];

export default defineConfig(({ mode }): UserConfig => {
	const env = loadEnv(mode, process.cwd(), '') as ImportMetaEnv;
	// Base path for serving the app (e.g., '/signoz/'). Defaults to '/'.
	const basePath = env.VITE_BASE_PATH || '/';

	const plugins = [
		rawMarkdownPlugin(),
		devBasePathPlugin(basePath),
		devBootDataPlugin(env),
		react(),
		vitePluginChecker({
			typescript: true,
			// this doubles the build tim
			// disabled to use Biome/tsgo (in the future) as alternative
			enableBuild: false,
		}),
	];

	if (env.VITE_SENTRY_AUTH_TOKEN) {
		if (!env.VITE_SENTRY_ORG || !env.VITE_SENTRY_PROJECT_ID) {
			throw new Error(
				'VITE_SENTRY_ORG and VITE_SENTRY_PROJECT_ID must be defined when VITE_SENTRY_AUTH_TOKEN is present.',
			);
		}
		// Refuse to upload sourcemaps without an explicit version.
		if (!env.VITE_VERSION) {
			throw new Error(
				'VITE_VERSION must be set to upload sourcemaps to Sentry; refusing to upload without a matching release.',
			);
		}
		plugins.push(
			sentryVitePlugin({
				authToken: env.VITE_SENTRY_AUTH_TOKEN,
				org: env.VITE_SENTRY_ORG,
				project: env.VITE_SENTRY_PROJECT_ID,
				// Pin the sourcemap-upload release to the same value injected as
				// process.env.VERSION so uploaded sourcemaps resolve. Ref: platform-pod#2393
				// `inject: false`: the release string would otherwise land in every chunk
				// and change all their hashes on each release. Sentry.init sets it.
				release: {
					name: env.VITE_VERSION,
					inject: false,
					setCommits: { auto: true },
				},
			}),
		);
	}

	if (env.BUNDLE_ANALYSER === 'true') {
		plugins.push(
			visualizer({
				open: true,
				gzipSize: true,
				brotliSize: true,
			}),
		);
	}

	if (mode === 'production') {
		plugins.push(viteCompression());
	}

	return {
		plugins,
		resolve: {
			tsconfigPaths: true,
			alias: {
				// @grafana/data imports bare CJS `lodash`, whose UMD footer checks for an
				// AMD loader before assigning module.exports. Any third-party script that
				// defines window.define.amd first leaves the bundled namespace empty, so
				// every lodash method reached through it is undefined at runtime. lodash-es
				// is the same version, real ESM, and tree-shakes.
				lodash: 'lodash-es',
				'@': resolve(import.meta.dirname, './src'),
				utils: resolve(import.meta.dirname, './src/utils'),
				types: resolve(import.meta.dirname, './src/types'),
				constants: resolve(import.meta.dirname, './src/constants'),
				parser: resolve(import.meta.dirname, './src/parser'),
				providers: resolve(import.meta.dirname, './src/providers'),
				lib: resolve(import.meta.dirname, './src/lib'),
			},
		},
		css: {
			preprocessorOptions: {
				less: {
					javascriptEnabled: true,
				},
			},
			modules: {
				localsConvention: 'camelCaseOnly',
			},
		},
		define: {
			// TODO: Remove this in favor of import.meta.env
			'process.env.NODE_ENV': JSON.stringify(mode),
			'process.env.FRONTEND_API_ENDPOINT': JSON.stringify(
				env.VITE_FRONTEND_API_ENDPOINT,
			),
			'process.env.WEBSOCKET_API_ENDPOINT': JSON.stringify(
				env.VITE_WEBSOCKET_API_ENDPOINT,
			),
			'process.env.DOCS_BASE_URL': JSON.stringify(env.VITE_DOCS_BASE_URL),
			'process.env.ENVIRONMENT': JSON.stringify(env.VITE_ENVIRONMENT),
			'process.env.VERSION': JSON.stringify(env.VITE_VERSION),
		},
		// In production, use relative paths so assets work with any base path injected by the backend.
		// In dev, use the configured base path for proper HMR and routing.
		base: mode === 'production' ? './' : basePath,
		build: {
			sourcemap: true,
			outDir: 'build',
			cssMinify: 'esbuild',
			chunkImportMap: true,
			rolldownOptions: {
				treeshake: {
					moduleSideEffects: [
						{
							test: new RegExp(
								`monaco-editor/esm/vs/editor/contrib/(${MONACO_UNUSED_CONTRIBS.join('|')})/`,
							),
							sideEffects: false,
						},
					],
				},
				output: {
					// Export aliases are renumbered whenever a chunk's exports change, which
					// re-hashes every importer.
					minifyInternalExports: false,
					// Without these groups Rolldown splits the entry's static graph into ~300
					// chunks, 324 requests on first load. `initial` keeps the app code of that
					// graph in one chunk, so the packages around it can keep their hashes.
					codeSplitting: {
						groups: [
							{
								name: vendorChunkName,
								debugName: 'per-package',
								test: 'node_modules',
								tags: ['$initial'],
								minSize: 100 * 1024,
								priority: 5,
							},
							{
								name: 'v-misc',
								test: 'node_modules',
								tags: ['$initial'],
								priority: 1,
							},
							{ name: 'initial', tags: ['$initial'] },
						],
					},
				},
				plugins: [injectChunkImportMap()],
			},
		},
		// An iife worker runs as a sloppy script, where a function declared in a
		// block is hoisted as a `var` over the minifier's renamed outer names (the
		// JSON worker's validation then throws on every non-empty array).
		worker: {
			format: 'es',
		},
		server: {
			open: true,
			port: 3301,
			host: true,
		},
		preview: {
			port: 3301,
		},
	};
});
