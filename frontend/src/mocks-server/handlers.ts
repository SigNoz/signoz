import { rest } from 'msw';

import { billingSuccessResponse } from './__mockdata__/billing';
import { licensesSuccessResponse } from './__mockdata__/licenses';
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

	rest.get(
		'http://localhost/api/v2/metrics/autocomplete/tagKey',
		(req, res, ctx) => {
			const metricName = req.url.searchParams.get('metricName');
			const match = req.url.searchParams.get('match');

			if (metricName === 'signoz_calls_total' && match === 'resource_') {
				return res(
					ctx.status(200),
					ctx.json({ status: 'success', data: ['resource_signoz_collector_id'] }),
				);
			}

			return res(ctx.status(500));
		},
	),

	rest.get(
		'http://localhost/api/v2/metrics/autocomplete/tagValue',
		(req, res, ctx) => {
			// ?metricName=signoz_calls_total&tagKey=resource_signoz_collector_id
			const metricName = req.url.searchParams.get('metricName');
			const tagKey = req.url.searchParams.get('tagKey');

			if (
				metricName === 'signoz_calls_total' &&
				tagKey === 'resource_signoz_collector_id'
			) {
				return res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: [
							'f38916c2-daf2-4424-bd3e-4907a7e537b6',
							'6d4af7f0-4884-4a37-abd4-6bdbee29fa04',
							'523c44b9-5fe1-46f7-9163-4d2c57ece09b',
							'aa52e8e8-6f88-4056-8fbd-b377394d022c',
							'4d515ba2-065d-4856-b2d8-ddb957c44ddb',
							'fd47a544-1410-4c76-a554-90ef6464da02',
							'bb455f71-3fe1-4761-bbf5-efe2faee18a6',
							'48563680-314e-4117-8a6d-1f0389c95e04',
							'6e866423-7704-4d72-be8b-4695bc36f145',
							'e4886c76-93f5-430f-9076-eef85524312f',
						],
					}),
				);
			}

			return res(ctx.status(500));
		},
	),

	rest.get('http://localhost/api/v2/licenses', (req, res, ctx) =>
		res(ctx.status(200), ctx.json(licensesSuccessResponse)),
	),

	// ?licenseKey=58707e3d-3bdb-44e7-8c89-a9be237939f4
	rest.get('http://localhost/api/v1/billing', (req, res, ctx) =>
		res(ctx.status(200), ctx.json(billingSuccessResponse)),
	),
];
