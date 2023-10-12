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

	rest.get('http://localhost/api/v1/settings/apdex', (req, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json([
				{ serviceName: 'mockServiceName', threshold: 0.7, excludeStatusCodes: '' },
			]),
		),
	),

	rest.post('http://localhost/api/v1/settings/apdex', (req, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json({
				data: 'apdex score updated successfully',
			}),
		),
	),

	rest.post(
		'http://localhost/api/v1/api/v1/service/top_operations',
		(req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json([
					{
						p50: 310908500,
						p95: 573294000,
						p99: 749915500,
						numCalls: 1626,
						errorCount: 0,
						name: 'HTTP GET /customer',
					},
				]),
			),
	),

	rest.get('http://localhost/api/v1/metric_meta', (req, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json({
				delta: false,
				le: [
					0.1,
					1,
					2,
					6,
					10,
					50,
					100,
					250,
					500,
					1000,
					1400,
					2000,
					5000,
					10000,
					20000,
					40000,
					60000,
				],
			}),
		),
	),
];
