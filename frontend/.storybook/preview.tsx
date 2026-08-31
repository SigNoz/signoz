import type { Preview } from '@storybook/react-vite';
import type { SetupWorker } from 'msw';
import { setupWorker } from 'msw';

import PageDocs from '../src/storybook/docs/PageDocs';
import ThemedDocsContainer from '../src/storybook/docs/ThemedDocsContainer';
import { withProviders } from '../src/storybook/decorators/withProviders';
import { globalMocks } from '../src/storybook/globals';
import { resetStoryHistory } from '../src/storybook/navigation/containment';
import { clearBlockedNavigations } from '../src/storybook/navigation/blockedNavigationStore';
import {
	resolveStory,
	type StoryRuntimeContext,
} from '../src/storybook/runtime/resolveStory';

import '../src/ReactI18';

// `src/index.tsx` does this at boot: without it `@monaco-editor/react` falls back
// to its loader default and pulls Monaco from cdn.jsdelivr.net, which msw does
// not report because the requests look like static assets.
import '../src/lib/monaco/setup';

import '../src/styles.scss';

import '../src/storybook/storybook-root.scss';

interface StorybookWorkerHolder {
	__signozStorybookWorker?: StorybookWorker;
}

const holder = window as unknown as StorybookWorkerHolder;

/**
 * One worker per page, even if this module is re-executed by HMR. Two live
 * workers both answer the service worker and the story gets whichever replies
 * first.
 */
interface StorybookWorker {
	worker: SetupWorker;
	ready: Promise<unknown>;
}

const { worker, ready } = (holder.__signozStorybookWorker ??=
	((): StorybookWorker => {
		const instance = setupWorker();

		return {
			worker: instance,
			ready: instance.start({
				serviceWorker: { url: './mockServiceWorker.js' },
				// Storybook's own traffic (index.json, HMR, telemetry) goes unhandled by
				// design; only flag the app's API calls so a missing handler is obvious.
				onUnhandledRequest: (request, print): void => {
					const url = new URL(request.url.href);
					const isStaticAsset =
						/\.(?:woff2?|ttf|otf|css|js|map|png|jpe?g|svg|webp|ico)$/.test(
							url.pathname,
						);
					const isAppRequest =
						!isStaticAsset &&
						(url.pathname.startsWith('/api/') || url.host !== window.location.host);

					if (isAppRequest) {
						print.warning();
					}
				},
			}),
		};
	})());

const preview: Preview = {
	parameters: {
		layout: 'fullscreen',
		controls: { expanded: true },
		docs: { page: PageDocs, container: ThemedDocsContainer },
	},
	// Every page story gets a docs page: the descriptions on the meta and on each
	// story are the page's documentation, and without this they render nowhere.
	tags: ['autodocs'],
	globalTypes: {
		theme: {
			description: 'SigNoz color scheme',
			toolbar: {
				title: 'Theme',
				icon: 'paintbrush',
				items: [
					{ value: 'dark', title: 'Dark' },
					{ value: 'light', title: 'Light' },
				],
				dynamicTitle: true,
			},
		},
	},
	initialGlobals: { theme: 'dark' },
	// Controls every story carries: permissions, banners, and whether the page's
	// own endpoints answer, hang or fail.
	args: globalMocks.args,
	argTypes: globalMocks.argTypes,
	decorators: [withProviders],
	loaders: [
		// Runs on every render, args changes included, and ahead of the decorators:
		// the whole story world is put in place here, so the provider tree only has
		// to read it. Re-registering the handlers per render also means an edit to a
		// handler module takes effect on the next render instead of leaving the
		// worker on the set it was created with.
		async (context): Promise<void> => {
			const world = resolveStory(context as unknown as StoryRuntimeContext);

			world.apply();
			world.install(worker);

			await ready;
		},
	],
	beforeEach: () => {
		clearBlockedNavigations();
		resetStoryHistory();
	},
};

export default preview;
