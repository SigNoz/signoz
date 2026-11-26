import { rest } from 'msw';

import commonEnTranslation from '../../public/locales/en/common.json';
import enTranslation from '../../public/locales/en/translation.json';
import {
	notificationChannelsV2,
	notificationChannelV2,
} from './__mockdata__/alerts';
import {
	alertRulesFixture,
	listRulesV3Response,
	ruleViewsFixture,
} from './__mockdata__/alert_rules';
import { triggeredAlertsFixture } from './__mockdata__/triggered_alerts';
import { billingSuccessResponse } from './__mockdata__/billing';
import {
	dashboardSuccessResponse,
	getDashboardById,
} from './__mockdata__/dashboards';
import { licensesSuccessResponse } from './__mockdata__/licenses';
import { serviceSuccessResponse } from './__mockdata__/services';
import { topLevelOperationSuccessResponse } from './__mockdata__/top_level_operations';
import { traceDetailResponse } from './__mockdata__/tracedetail';

export const handlers = [
	rest.post('http://localhost/api/v2/services', (req, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json({ status: 'success', data: serviceSuccessResponse }),
		),
	),

	rest.post(
		'http://localhost/api/v1/service/top_level_operations',
		(req, res, ctx) =>
			res(ctx.status(200), ctx.json(topLevelOperationSuccessResponse)),
	),

	rest.get('http://localhost/api/v2/licenses', (req, res, ctx) =>
		res(ctx.status(200), ctx.json(licensesSuccessResponse)),
	),

	rest.get('http://localhost/api/v1/subscriptions', (req, res, ctx) =>
		res(ctx.status(200), ctx.json(billingSuccessResponse)),
	),

	rest.get('http://localhost/api/v1/dashboards', (_, res, ctx) =>
		res(ctx.status(200), ctx.json(dashboardSuccessResponse)),
	),

	rest.get('http://localhost/api/v1/dashboards/4', (_, res, ctx) =>
		res(ctx.status(200), ctx.json(getDashboardById)),
	),

	rest.post('http://localhost/api/v2/users', (_, res, ctx) =>
		res(
			ctx.status(201),
			ctx.json({
				data: { id: 'user-123' },
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

	rest.get('http://localhost/api/v2/notification_channels', (req, res, ctx) => {
		const query = req.url.searchParams.get('query')?.toLowerCase() ?? '';
		const kind = req.url.searchParams.get('kind');
		const channels = notificationChannelsV2.filter(
			(channel) =>
				(!query || channel.displayName.toLowerCase().includes(query)) &&
				(!kind || channel.kind === kind),
		);
		return res(
			ctx.status(200),
			ctx.json({
				data: { channels, total: channels.length },
				status: 'success',
			}),
		);
	}),
	rest.get('http://localhost/api/v2/notification_channels/:id', (_, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json({ data: notificationChannelV2, status: 'success' }),
		),
	),
	rest.delete(
		'http://localhost/api/v2/notification_channels/:id',
		(_, res, ctx) => res(ctx.status(204)),
	),
	rest.get('http://localhost/api/v1/alerts', (_, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json({ data: triggeredAlertsFixture, status: 'success' }),
		),
	),
	rest.get('http://localhost/api/v2/rules', (_, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json({ data: alertRulesFixture, status: 'success' }),
		),
	),
	rest.get('http://localhost/api/v3/rules', (req, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json(listRulesV3Response(alertRulesFixture, req.url.searchParams)),
		),
	),
	rest.get('http://localhost/api/v2/rule_views', (_, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json({ data: { views: ruleViewsFixture }, status: 'success' }),
		),
	),
	rest.post('http://localhost/api/v2/rule_views', async (req, res, ctx) => {
		const body = (await req.json()) as Pick<
			(typeof ruleViewsFixture)[number],
			'name' | 'data'
		>;
		return res(
			ctx.status(201),
			ctx.json({
				data: { ...ruleViewsFixture[0], ...body, id: 'new-view-id' },
				status: 'success',
			}),
		);
	}),
	rest.put('http://localhost/api/v2/rule_views/:id', async (req, res, ctx) => {
		const body = (await req.json()) as Pick<
			(typeof ruleViewsFixture)[number],
			'name' | 'data'
		>;
		return res(
			ctx.status(200),
			ctx.json({
				data: { ...ruleViewsFixture[0], ...body, id: req.params.id },
				status: 'success',
			}),
		);
	}),
	rest.delete('http://localhost/api/v2/rule_views/:id', (_, res, ctx) =>
		res(ctx.status(204)),
	),
	rest.post('http://localhost/api/v2/rules', async (req, res, ctx) => {
		const body = (await req.json()) as { alert?: string };
		return res(
			ctx.status(201),
			ctx.json({
				data: {
					...alertRulesFixture[0],
					id: 'new-rule-id',
					alert: body?.alert ?? 'New Rule',
				},
				status: 'success',
			}),
		);
	}),
	rest.patch('http://localhost/api/v2/rules/:id', (_, res, ctx) =>
		res(ctx.status(200), ctx.json({ status: 'success' })),
	),
	rest.delete('http://localhost/api/v2/rules/:id', (_, res, ctx) =>
		res(ctx.status(200), ctx.json({ status: 'success' })),
	),
	rest.get('http://localhost/locales/en/translation.json', (_, res, ctx) =>
		res(ctx.status(200), ctx.json(enTranslation)),
	),
	rest.get('http://localhost/locales/en/common.json', (_, res, ctx) =>
		res(ctx.status(200), ctx.json(commonEnTranslation)),
	),
	rest.get('http://localhost/locales/en-US/translation.json', (_, res, ctx) =>
		res(ctx.status(200), ctx.json(enTranslation)),
	),
	rest.get('http://localhost/locales/en-US/common.json', (_, res, ctx) =>
		res(ctx.status(200), ctx.json(commonEnTranslation)),
	),
];
