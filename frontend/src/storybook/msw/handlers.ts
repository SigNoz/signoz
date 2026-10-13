import { rest } from 'msw';
import { handlers as sharedHandlers } from 'mocks-server/handlers';

import { appShellHandlers } from './appShellHandlers';
import { queryBuilderHandlers } from './queryBuilderHandlers';

/**
 * Last resort: every axios instance is built on `ENVIRONMENT.baseURL`, which
 * `mocks/env.mock.ts` pins to `http://localhost`, so an endpoint nobody mocked
 * lands here instead of leaving the browser. Failing loudly beats a request
 * that hangs until the connection is refused.
 */
const unmockedApiGuard = [
	rest.all('http://localhost/api/*', (req, res, ctx) => {
		console.error(
			`[storybook] no msw handler for ${req.method} ${req.url.pathname}. Add one to the page's mocks or to src/storybook/msw/appShellHandlers.ts`,
		);

		return res(
			ctx.status(501),
			ctx.json({ status: 'error', error: 'not mocked in Storybook' }),
		);
	}),
];

/**
 * Default handler set for every story, resolved first match wins: the
 * Storybook-only shell and query builder handlers override the jest ones where
 * those answer with a fixture too thin for a page to render on, and both a
 * page's control-driven handlers and a story's own `parameters.msw.handlers`
 * are layered on top at render time. An endpoint both runners need belongs in
 * `src/mocks-server/handlers.ts` instead.
 */
export const storybookHandlers = [
	...appShellHandlers,
	...queryBuilderHandlers,
	...sharedHandlers,
	...unmockedApiGuard,
];
