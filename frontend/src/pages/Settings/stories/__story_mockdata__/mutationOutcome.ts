import type { DefaultBodyType, ResponseComposition, RestContext } from 'msw';

import type { MockResolver } from '@/storybook/msw/types';

export const MUTATION_OUTCOMES = ['success', 'loading', 'error'] as const;

export type MutationOutcome = (typeof MUTATION_OUTCOMES)[number];

const FAILURE = {
	status: 'error',
	error: { code: 'internal', message: 'The request failed' },
};

/** The answer for an outcome: the body, never answering, or a 500. */
export const mutationResponse = (
	outcome: MutationOutcome,
	body: DefaultBodyType,
	res: ResponseComposition<DefaultBodyType>,
	ctx: RestContext,
): ReturnType<typeof res> => {
	if (outcome === 'loading') {
		return res(ctx.delay('infinite'));
	}

	return outcome === 'error'
		? res(ctx.status(500), ctx.json(FAILURE))
		: res(ctx.status(200), ctx.json(body));
};

export const mutationResolver =
	(
		outcome: MutationOutcome,
		body: DefaultBodyType = { status: 'success', data: null },
	): MockResolver =>
	(_req, res, ctx) =>
		mutationResponse(outcome, body, res, ctx);
