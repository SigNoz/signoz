import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import type { Plugin, UserConfig } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import vitePluginChecker from 'vite-plugin-checker';
import viteCompression from 'vite-plugin-compression';
import { createHtmlPlugin } from 'vite-plugin-html';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import tsconfigPaths from 'vite-tsconfig-paths';

function rawMarkdownPlugin(): Plugin {
	return {
		name: 'raw-markdown',
		transform(_, id): any {
			if (id.endsWith('.md')) {
				const content = readFileSync(id, 'utf-8');
				return {
					code: `export default ${JSON.stringify(content)};`,
					map: null,
				};
			}
			return undefined;
		},
	};
}

export default defineConfig(
	({ mode }): UserConfig => {
		const env = loadEnv(mode, process.cwd(), '');

		const plugins = [
			tsconfigPaths(),
			rawMarkdownPlugin(),
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

		if (env.NODE_ENV === 'production') {
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
			},
			define: {
				// TODO: Remove this in favor of import.meta.env
				'process.env': JSON.stringify({
					NODE_ENV: mode,
					FRONTEND_API_ENDPOINT: env.VITE_FRONTEND_API_ENDPOINT,
					WEBSOCKET_API_ENDPOINT: env.VITE_WEBSOCKET_API_ENDPOINT,
					PYLON_APP_ID: env.VITE_PYLON_APP_ID,
					PYLON_IDENTITY_SECRET: env.VITE_PYLON_IDENTITY_SECRET,
					APPCUES_APP_ID: env.VITE_APPCUES_APP_ID,
					POSTHOG_KEY: env.VITE_POSTHOG_KEY,
					SENTRY_AUTH_TOKEN: env.VITE_SENTRY_AUTH_TOKEN,
					SENTRY_ORG: env.VITE_SENTRY_ORG,
					SENTRY_PROJECT_ID: env.VITE_SENTRY_PROJECT_ID,
					SENTRY_DSN: env.VITE_SENTRY_DSN,
					TUNNEL_URL: env.VITE_TUNNEL_URL,
					TUNNEL_DOMAIN: env.VITE_TUNNEL_DOMAIN,
					DOCS_BASE_URL: env.VITE_DOCS_BASE_URL,
				}),
			},
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
