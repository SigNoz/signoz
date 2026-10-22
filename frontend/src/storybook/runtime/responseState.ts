import type { DefaultBodyType } from 'msw';

import type { MockRequest, MockResolver } from '../msw/types';

export const RESPONSE_STATES = ['loaded', 'loading', 'error'] as const;

export type ResponseState = (typeof RESPONSE_STATES)[number];

/**
 * The three answers every mocked endpoint can give, in one place: the payload
 * the caller built, a request that never resolves, or a failure. A story reaches
 * all three by turning one control, and a fourth state added here reaches every
 * endpoint declared through it.
 */
export const respondWith =
	<TBody>(
		state: ResponseState,
		build: (req: MockRequest) => TBody | Promise<TBody>,
	): MockResolver =>
	async (req, res, ctx) => {
		if (state === 'loading') {
			return res(ctx.delay('infinite'));
		}

		if (state === 'error') {
			return res(
				ctx.status(500),
				ctx.json({ status: 'error', error: 'storybook: forced failure' }),
			);
		}

		return res(ctx.status(200), ctx.json((await build(req)) as DefaultBodyType));
	};
