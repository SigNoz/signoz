import { rest } from 'msw';

import {
	changelogResponse,
	globalConfigResponse,
	latestGithubReleaseResponse,
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
];
