import { rest } from 'msw';

import { allAlertChannels } from './__mockdata__/alerts';
import { billingSuccessResponse } from './__mockdata__/billing';
import {
	dashboardSuccessResponse,
	getDashboardById,
} from './__mockdata__/dashboards';
import { explorerView } from './__mockdata__/explorer_views';
import { inviteUser } from './__mockdata__/invite_user';
import { licensesSuccessResponse } from './__mockdata__/licenses';
import { membersResponse } from './__mockdata__/members';
import { queryRangeSuccessResponse } from './__mockdata__/query_range';
import { serviceSuccessResponse } from './__mockdata__/services';
import { topLevelOperationSuccessResponse } from './__mockdata__/top_level_operations';
import { traceDetailResponse } from './__mockdata__/tracedetail';

export const handlers = [
	rest.post('http://localhost/api/v3/query_range', (req, res, ctx) =>
		res(ctx.status(200), ctx.json(queryRangeSuccessResponse)),
	),

	rest.post('http://localhost/api/v4/query_range', (req, res, ctx) =>
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

	rest.get('http://localhost/api/v1/orgUsers/*', (req, res, ctx) =>
		res(ctx.status(200), ctx.json(membersResponse)),
	),
	rest.get(
		'http://localhost/api/v3/autocomplete/attribute_keys',
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
		'http://localhost/api/v3/autocomplete/attribute_values',
		(req, res, ctx) => {
			// ?metricName=signoz_calls_total&tagKey=resource_signoz_collector_id
			const metricName = req.url.searchParams.get('metricName');
			const tagKey = req.url.searchParams.get('tagKey');

			const attributeKey = req.url.searchParams.get('attributeKey');

			if (attributeKey === 'serviceName') {
				return res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							stringAttributeValues: [
								'customer',
								'demo-app',
								'driver',
								'frontend',
								'mysql',
								'redis',
								'route',
								'go-grpc-otel-server',
								'test',
							],
							numberAttributeValues: null,
							boolAttributeValues: null,
						},
					}),
				);
			}

			if (attributeKey === 'name') {
				return res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							stringAttributeValues: [
								'HTTP GET',
								'HTTP GET /customer',
								'HTTP GET /dispatch',
								'HTTP GET /route',
							],
							numberAttributeValues: null,
							boolAttributeValues: null,
						},
					}),
				);
			}

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
	rest.get('http://localhost/api/v1/loginPrecheck', (req, res, ctx) => {
		const email = req.url.searchParams.get('email');
		if (email === 'failEmail@signoz.io') {
			return res(ctx.status(500));
		}

		return res(
			ctx.status(200),
			ctx.json({
				status: 'success',
				data: {
					sso: true,
					ssoUrl: '',
					canSelfRegister: false,
					isUser: true,
					ssoError: '',
				},
			}),
		);
	}),

	rest.get('http://localhost/api/v2/licenses', (req, res, ctx) =>
		res(ctx.status(200), ctx.json(licensesSuccessResponse)),
	),

	rest.get('http://localhost/api/v1/billing', (req, res, ctx) =>
		res(ctx.status(200), ctx.json(billingSuccessResponse)),
	),

	rest.get('http://localhost/api/v1/dashboards', (_, res, ctx) =>
		res(ctx.status(200), ctx.json(dashboardSuccessResponse)),
	),

	rest.get('http://localhost/api/v1/dashboards/4', (_, res, ctx) =>
		res(ctx.status(200), ctx.json(getDashboardById)),
	),

	rest.get('http://localhost/api/v1/invite', (_, res, ctx) =>
		res(ctx.status(200), ctx.json(inviteUser)),
	),
	rest.post('http://localhost/api/v1/invite', (_, res, ctx) =>
		res(ctx.status(200), ctx.json(inviteUser)),
	),
	rest.put('http://localhost/api/v1/user/:id', (_, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json({
				data: 'user updated successfully',
			}),
		),
	),
	rest.post('http://localhost/api/v1/changePassword', (_, res, ctx) =>
		res(
			ctx.status(403),
			ctx.json({
				status: 'error',
				errorType: 'forbidden',
				error: 'invalid credentials',
			}),
		),
	),

	rest.get(
		'http://localhost/api/v3/autocomplete/aggregate_attributes',
		(req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: { attributeKeys: null },
				}),
			),
	),

	rest.get('http://localhost/api/v1/explorer/views', (req, res, ctx) =>
		res(ctx.status(200), ctx.json(explorerView)),
	),

	rest.post('http://localhost/api/v1/explorer/views', (req, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json({
				status: 'success',
				data: '7731ece1-3fa3-4ed4-8b1c-58b4c28723b2',
			}),
		),
	),

	rest.post('http://localhost/api/v1/event', (req, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json({
				statusCode: 200,
				error: null,
				payload: 'Event Processed Successfully',
			}),
		),
	),

	rest.get(
		'http://localhost/api/v1/traces/000000000000000071dc9b0a338729b4',
		(req, res, ctx) => res(ctx.status(200), ctx.json(traceDetailResponse)),
	),

	rest.post('http://localhost/api/v1//channels', (_, res, ctx) =>
		res(ctx.status(200), ctx.json(allAlertChannels)),
	),
	rest.delete('http://localhost/api/v1/channels/:id', (_, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json({
				status: 'success',
				data: 'notification channel successfully deleted',
			}),
		),
	),
];
