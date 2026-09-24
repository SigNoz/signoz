import { rest } from 'msw';

import {
	changelogResponse,
	globalConfigResponse,
	latestGithubReleaseResponse,
	licenseWithKeyResponse,
	nozGlobalConfigResponse,
	userPreferencesResponse,
	versionResponse,
	zeusHostsResponse,
} from './__story_mockdata__/appShell';

/**
 * Endpoints the app shell hits on every route that the jest handlers in
 * `src/mocks-server/handlers.ts` either do not cover or answer with fixtures
 * too thin to show the shell doing its job. Resolved ahead of the shared set,
 * and a page's own control-driven handlers are resolved ahead of these.
 */
export const appShellHandlers = [
	rest.get('http://localhost/api/v1/user/preferences', (_req, res, ctx) =>
		res(ctx.status(200), ctx.json(userPreferencesResponse())),
	),

	rest.put('http://localhost/api/v1/user/preferences/:name', (_req, res, ctx) =>
		res(ctx.status(200), ctx.json({ status: 'success', data: null })),
	),

	rest.get('http://localhost/api/v2/zeus/hosts', (_req, res, ctx) =>
		res(ctx.status(200), ctx.json(zeusHostsResponse)),
	),

	rest.get('http://localhost/api/v1/global/config', (_req, res, ctx) =>
		res(ctx.status(200), ctx.json(globalConfigResponse)),
	),

	// The settings, account and billing pages each read the workspace's licence
	// key off this endpoint, which the app-shell context does not cover: it
	// carries the active licence, and the key is only served by id.
	rest.get('http://localhost/api/v4/licenses/:id', (_req, res, ctx) =>
		res(ctx.status(200), ctx.json(licenseWithKeyResponse)),
	),

	// `RefreshPaymentStatus`, which the billing tab, the payment banners and the
	// locked and suspended pages all carry.
	rest.put('http://localhost/api/v4/licenses/:id', (_req, res, ctx) =>
		res(ctx.status(200)),
	),

	rest.get('http://localhost/api/v1/version', (_req, res, ctx) =>
		res(ctx.status(200), ctx.json(versionResponse)),
	),

	rest.get(
		'https://api.github.com/repos/signoz/signoz/releases/latest',
		(_req, res, ctx) =>
			res(ctx.status(200), ctx.json(latestGithubReleaseResponse)),
	),

	rest.get('https://cms.signoz.cloud/api/release-changelogs', (_req, res, ctx) =>
		res(ctx.status(200), ctx.json(changelogResponse)),
	),

	// The webfonts `index.html` links and `styles.scss` imports. The story
	// declares the same families over `public/fonts` in
	// `.storybook/public/storybook-fonts.css`, so answering the CDN with nothing
	// keeps a request from leaving the browser on every story.
	rest.get('https://fonts.googleapis.com/css2', (_req, res, ctx) =>
		res(ctx.status(200), ctx.text('')),
	),
];

/**
 * A story's own `parameters.msw.handlers` are resolved ahead of
 * `appShellHandlers`, so the `Foundations/Tooltips` Noz story wires this in to
 * override the global config's `ai_assistant_url` without the default set
 * doing so for every other story.
 */
export const nozGlobalConfigHandler = rest.get(
	'http://localhost/api/v1/global/config',
	(_req, res, ctx) => res(ctx.status(200), ctx.json(nozGlobalConfigResponse)),
);
