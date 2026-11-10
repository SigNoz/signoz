import { rest } from 'msw';

const SUBSCRIPTIONS = 'http://localhost/api/v1/subscriptions';

export const createSubscriptionHandlers = [
	rest.post(SUBSCRIPTIONS, (_req, res, ctx) =>
		res(ctx.status(200), ctx.json({ data: { redirectURL: '' } })),
	),
];
