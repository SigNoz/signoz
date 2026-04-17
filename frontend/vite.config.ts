import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import type { Plugin, TransformResult, UserConfig } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import vitePluginChecker from 'vite-plugin-checker';
import viteCompression from 'vite-plugin-compression';
import { createHtmlPlugin } from 'vite-plugin-html';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import tsconfigPaths from 'vite-tsconfig-paths';

// In dev the Go backend is not involved, so replace the [[.BaseHref]] placeholder
// with "/" so relative assets resolve correctly from the Vite dev server.
function devBasePathPlugin(): Plugin {
	return {
		name: 'dev-base-path',
		apply: 'serve',
		transformIndexHtml(html): string {
			return html.replaceAll('[[.BaseHref]]', '/');
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

export default defineConfig(
	({ mode }): UserConfig => {
		const env = loadEnv(mode, process.cwd(), '');

		const plugins = [
			tsconfigPaths(),
			rawMarkdownPlugin(),
			devBasePathPlugin(),
			react(),
			createHtmlPlugin({
				inject: {
					data: {
						PYLON_APP_ID: env.VITE_PYLON_APP_ID || '',
						APPCUES_APP_ID: env.VITE_APPCUES_APP_ID || '',
					},
				},
			}),
			vitePluginChecker({
				typescript: true,
				// this doubles the build tim
				// disabled to use Biome/tsgo (in the future) as alternative
				enableBuild: false,
			}),
		];

		if (env.VITE_SENTRY_AUTH_TOKEN) {
			plugins.push(
				sentryVitePlugin({
					authToken: env.VITE_SENTRY_AUTH_TOKEN,
					org: env.VITE_SENTRY_ORG,
					project: env.VITE_SENTRY_PROJECT_ID,
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
			plugins.push(
				ViteImageOptimizer({
					jpeg: { quality: 80 },
					jpg: { quality: 80 },
				}),
			);
			plugins.push(viteCompression());
		}

		return {
			plugins,
			resolve: {
				alias: {
					'@': resolve(__dirname, './src'),
					utils: resolve(__dirname, './src/utils'),
					types: resolve(__dirname, './src/types'),
					constants: resolve(__dirname, './src/constants'),
					parser: resolve(__dirname, './src/parser'),
					providers: resolve(__dirname, './src/providers'),
					lib: resolve(__dirname, './src/lib'),
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
				'process.env.PYLON_APP_ID': JSON.stringify(env.VITE_PYLON_APP_ID),
				'process.env.PYLON_IDENTITY_SECRET': JSON.stringify(
					env.VITE_PYLON_IDENTITY_SECRET,
				),
				'process.env.APPCUES_APP_ID': JSON.stringify(env.VITE_APPCUES_APP_ID),
				'process.env.POSTHOG_KEY': JSON.stringify(env.VITE_POSTHOG_KEY),
				'process.env.SENTRY_ORG': JSON.stringify(env.VITE_SENTRY_ORG),
				'process.env.SENTRY_PROJECT_ID': JSON.stringify(env.VITE_SENTRY_PROJECT_ID),
				'process.env.SENTRY_DSN': JSON.stringify(env.VITE_SENTRY_DSN),
				'process.env.TUNNEL_URL': JSON.stringify(env.VITE_TUNNEL_URL),
				'process.env.TUNNEL_DOMAIN': JSON.stringify(env.VITE_TUNNEL_DOMAIN),
				'process.env.DOCS_BASE_URL': JSON.stringify(env.VITE_DOCS_BASE_URL),
			},
			base: './',
			build: {
				sourcemap: true,
				outDir: 'build',
				cssMinify: 'esbuild',
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
	},
);
