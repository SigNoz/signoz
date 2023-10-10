import { rest } from 'msw';

import { queryRangeSuccessResponse } from './__mockdata__/query_range';
import { serviceSuccessResponse } from './__mockdata__/services';
import { topLevelOperationSuccessResponse } from './__mockdata__/top_level_operations';

export const handlers = [
	rest.post('http://localhost/api/v3/query_range', (req, res, ctx) =>
		res(ctx.status(200), ctx.json(queryRangeSuccessResponse)),
	),

	rest.post('http://localhost/api/v1/services', (req, res, ctx) =>
		res(ctx.status(200), ctx.json(serviceSuccessResponse)),
	),

	rest.post(
		'http://localhost/api/v1/service/top_level_operations',
		(req, res, ctx) =>
			res(ctx.status(200), ctx.json(topLevelOperationSuccessResponse)),
	),
];
