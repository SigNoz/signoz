/**
 * Replaces `constants/env` in Storybook (aliased in `.storybook/main.ts`).
 *
 * The base URL must stay `http://localhost` so the msw handlers shared with
 * jest (`src/mocks-server/handlers.ts`), which are declared against that
 * origin, match requests issued from the Storybook iframe. msw intercepts
 * before the request leaves the page, so the cross-origin URL never hits the
 * network and CORS never applies.
 *
 * The annotation checks the module's shape against the real one, so a value
 * added to `constants/env` fails to compile here rather than at render.
 */
const libEnv: typeof import('constants/env') = {
	ENVIRONMENT: {
		baseURL: 'http://localhost',
		wsURL: 'ws://localhost',
	},
};

export const { ENVIRONMENT } = libEnv;
