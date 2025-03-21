import { http, HttpResponse } from 'msw';

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
	http.post('http://localhost/api/v3/query_range', () =>
		HttpResponse.json(queryRangeSuccessResponse, { status: 200 }),
	),

	http.post('http://localhost/api/v4/query_range', () =>
		HttpResponse.json(queryRangeSuccessResponse, { status: 200 }),
	),

	http.post('http://localhost/api/v1/services', () =>
		HttpResponse.json(serviceSuccessResponse, { status: 200 }),
	),

	http.post('http://localhost/api/v1/service/top_level_operations', () =>
		HttpResponse.json(topLevelOperationSuccessResponse, { status: 200 }),
	),

	http.get('http://localhost/api/v1/orgUsers/*', () =>
		HttpResponse.json(membersResponse, { status: 200 }),
	),
	http.get(
		'http://localhost/api/v3/autocomplete/attribute_keys',
		({ request }) => {
			const url = new URL(request.url);
			const metricName = url.searchParams.get('metricName');
			const match = url.searchParams.get('match');

			if (metricName === 'signoz_calls_total' && match === 'resource_') {
				return HttpResponse.json(
					{ status: 'success', data: ['resource_signoz_collector_id'] },
					{ status: 200 },
				);
			}

			return HttpResponse.json({}, { status: 500 });
		},
	),

	http.get(
		'http://localhost/api/v3/autocomplete/attribute_values',
		({ request }) => {
			const url = new URL(request.url);
			const metricName = url.searchParams.get('metricName');
			const tagKey = url.searchParams.get('tagKey');
			const attributeKey = url.searchParams.get('attributeKey');

			let responseData = null;

			if (attributeKey === 'serviceName') {
				responseData = {
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
				};
			} else if (attributeKey === 'name') {
				responseData = {
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
				};
			} else if (
				metricName === 'signoz_calls_total' &&
				tagKey === 'resource_signoz_collector_id'
			) {
				responseData = {
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
				};
			}

			if (responseData) {
				return HttpResponse.json(responseData, { status: 200 });
			}

			return HttpResponse.json({}, { status: 500 });
		},
	),

	http.get('http://localhost/api/v1/loginPrecheck', ({ request }) => {
		const url = new URL(request.url);
		const email = url.searchParams.get('email');

		if (email === 'failEmail@signoz.io') {
			return HttpResponse.json({}, { status: 500 });
		}

		return HttpResponse.json(
			{
				status: 'success',
				data: {
					sso: true,
					ssoUrl: '',
					canSelfRegister: false,
					isUser: true,
					ssoError: '',
				},
			},
			{ status: 200 },
		);
	}),

	http.get('http://localhost/api/v2/licenses', () =>
		HttpResponse.json(licensesSuccessResponse, { status: 200 }),
	),

	http.get('http://localhost/api/v1/billing', () =>
		HttpResponse.json(billingSuccessResponse, { status: 200 }),
	),

	http.get('http://localhost/api/v1/dashboards', () =>
		HttpResponse.json(dashboardSuccessResponse, { status: 200 }),
	),

	http.get('http://localhost/api/v1/dashboards/4', () =>
		HttpResponse.json(getDashboardById, { status: 200 }),
	),

	http.post('http://localhost/api/v1/invite', () =>
		HttpResponse.json(inviteUser, { status: 200 }),
	),

	http.put('http://localhost/api/v1/user/:id', () =>
		HttpResponse.json({ data: 'user updated successfully' }, { status: 200 }),
	),
	http.post('http://localhost/api/v1/changePassword', () =>
		HttpResponse.json(
			{ status: 'error', errorType: 'forbidden', error: 'invalid credentials' },
			{ status: 403 },
		),
	),

	http.get('http://localhost/api/v3/autocomplete/aggregate_attributes', () =>
		HttpResponse.json(
			{ status: 'success', data: { attributeKeys: null } },
			{ status: 200 },
		),
	),

	http.get('http://localhost/api/v1/explorer/views', () =>
		HttpResponse.json(explorerView, { status: 200 }),
	),

	http.post('http://localhost/api/v1/explorer/views', () =>
		HttpResponse.json(
			{ status: 'success', data: '7731ece1-3fa3-4ed4-8b1c-58b4c28723b2' },
			{ status: 200 },
		),
	),

	http.post('http://localhost/api/v1/event', () =>
		HttpResponse.json(
			{ statusCode: 200, error: null, payload: 'Event Processed Successfully' },
			{ status: 200 },
		),
	),

	http.get(
		'http://localhost/api/v1/traces/000000000000000071dc9b0a338729b4',
		() => HttpResponse.json(traceDetailResponse, { status: 200 }),
	),

	http.post('http://localhost/api/v1/channels', () =>
		HttpResponse.json(allAlertChannels, { status: 200 }),
	),

	http.delete('http://localhost/api/v1/channels/:id', () =>
		HttpResponse.json(
			{ status: 'success', data: 'notification channel successfully deleted' },
			{ status: 200 },
		),
	),
];
