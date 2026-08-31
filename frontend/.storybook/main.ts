import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { StorybookConfig } from '@storybook/react-vite';
import type { Plugin, PluginOption } from 'vite';

const srcPath = resolve(dirname(fileURLToPath(import.meta.url)), '../src');

/**
 * Modules replaced for every story. Same idea as `moduleNameMapper` in
 * `jest.config.ts`: the app keeps importing its own paths, Storybook resolves
 * them to a mock. Regexes so only exact specifiers match: `lib/history` must
 * not catch `lib/historyUtils`.
 *
 * Each replacement is typed as the module it stands in for, so drift is a
 * compile error rather than a story that fails at render. The `jest` note on
 * each entry is where the same import lands under the other runner. The two
 * only diverge where the runner needs them to.
 */
const mockAliases = [
	{
		// jest: not replaced, jsdom drives a real browser history.
		find: /^(?:src\/)?lib\/history$/,
		replacement: `${srcPath}/storybook/navigation/history.alias.ts`,
	},
	{
		// jest: src/__tests__/logEventMock.ts
		find: /^(?:src\/)?api\/common\/logEvent$/,
		replacement: `${srcPath}/storybook/mocks/logEvent.mock.ts`,
	},
	{
		// jest: not replaced, the suite mounts a mock store per test.
		find: /^(?:src\/)?store$/,
		replacement: `${srcPath}/storybook/mocks/store.mock.ts`,
	},
	{
		// jest: __mocks__/env.ts, which leaves `baseURL` empty because jsdom already
		// resolves a relative `/api/...` against `http://localhost`.
		find: /^(?:src\/)?constants\/env$/,
		replacement: `${srcPath}/storybook/mocks/env.mock.ts`,
	},
];

/**
 * Plugins from `vite.config.ts` that either target the app's `index.html` or
 * only pay off in a production build.
 */
const EXCLUDED_PLUGINS = [
	'vite-plugin-checker',
	'dev-base-path',
	'dev-boot-data',
	'vite-plugin-image-optimizer',
	'vite-plugin-compression',
];

const isExcluded = (plugin: PluginOption): boolean =>
	!!plugin &&
	typeof plugin === 'object' &&
	'name' in plugin &&
	EXCLUDED_PLUGINS.includes((plugin as Plugin).name);

const config: StorybookConfig = {
	framework: '@storybook/react-vite',
	stories: ['../src/**/*.stories.@(ts|tsx)'],
	// `../public` carries the fonts, icons and i18n bundles the app expects at
	// the root; `./public` carries the msw worker, which must not ship in a
	// production build.
	staticDirs: ['../public', './public'],
	addons: ['@storybook/addon-a11y'],
	core: { disableTelemetry: true },
	viteFinal: async (viteConfig) => {
		const plugins = (viteConfig.plugins ?? [])
			.flat(Infinity as 1)
			.filter((plugin) => !isExcluded(plugin as PluginOption));

		const existingAlias = viteConfig.resolve?.alias;
		const normalizedAlias = Array.isArray(existingAlias)
			? existingAlias
			: Object.entries(existingAlias ?? {}).map(([find, replacement]) => ({
					find,
					replacement: replacement as string,
				}));

		return {
			...viteConfig,
			build: {
				...viteConfig.build,
				// `vite.config.ts` sets this for the app; Storybook's builder replaces
				// `build` wholesale, which leaves rolldown-vite on its default
				// lightningcss. That one rejects `:global()` in a plain stylesheet, which
				// the app has, and the static build dies in CSS minification.
				cssMinify: 'esbuild',
			},
			plugins,
			resolve: {
				...viteConfig.resolve,
				alias: [...mockAliases, ...normalizedAlias],
			},
		};
	},
};

export default config;
