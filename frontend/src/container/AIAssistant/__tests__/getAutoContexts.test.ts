import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { serialize } from 'lib/compositeQuery/serializer';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { getAutoContexts } from '../getAutoContexts';

describe('getAutoContexts', () => {
	it('returns alert detail context on alert overview with ruleId', () => {
		const ruleId = 'rule-abc';
		const search = `?${QueryParams.ruleId}=${ruleId}&${QueryParams.relativeTime}=1h`;

		const contexts = getAutoContexts(ROUTES.ALERT_OVERVIEW, search);

		expect(contexts).toStrictEqual([
			{
				source: 'auto',
				type: 'alert',
				resourceId: ruleId,
				metadata: {
					page: 'alert_detail',
					ruleId,
				},
			},
		]);
	});

	it('returns alert detail context on alert history with ruleId', () => {
		const ruleId = 'rule-xyz';
		const startTime = '1700000000000';
		const endTime = '1700003600000';
		const search = `?${QueryParams.ruleId}=${ruleId}&${QueryParams.startTime}=${startTime}&${QueryParams.endTime}=${endTime}`;

		const contexts = getAutoContexts(ROUTES.ALERT_HISTORY, search);

		expect(contexts).toStrictEqual([
			{
				source: 'auto',
				type: 'alert',
				resourceId: ruleId,
				metadata: {
					page: 'alert_detail',
					ruleId,
					timeRange: {
						start: Number(startTime),
						end: Number(endTime),
					},
				},
			},
		]);
	});

	it('returns triggered alerts context on alert history without ruleId', () => {
		const contexts = getAutoContexts(ROUTES.ALERT_HISTORY, '');

		expect(contexts).toStrictEqual([
			{
				source: 'auto',
				type: 'alert',
				resourceId: null,
				metadata: {
					page: 'alerts_triggered',
				},
			},
		]);
	});

	it('resolves alert list tabs on /alerts', () => {
		expect(getAutoContexts(ROUTES.LIST_ALL_ALERT, '')).toStrictEqual([
			{
				source: 'auto',
				type: 'alert',
				resourceId: null,
				metadata: { page: 'alert_list' },
			},
		]);

		expect(
			getAutoContexts(ROUTES.LIST_ALL_ALERT, '?tab=AlertRules'),
		).toStrictEqual([
			{
				source: 'auto',
				type: 'alert',
				resourceId: null,
				metadata: { page: 'alert_list' },
			},
		]);

		expect(
			getAutoContexts(ROUTES.LIST_ALL_ALERT, '?tab=TriggeredAlerts'),
		).toStrictEqual([
			{
				source: 'auto',
				type: 'alert',
				resourceId: null,
				metadata: { page: 'alerts_triggered' },
			},
		]);

		expect(
			getAutoContexts(ROUTES.LIST_ALL_ALERT, '?tab=Configuration'),
		).toStrictEqual([
			{
				source: 'auto',
				type: 'alert',
				resourceId: null,
				metadata: { page: 'alert_list' },
			},
		]);
	});

	it('returns dashboard detail context on dashboard page', () => {
		const dashboardId = 'dash-123';
		const pathname = ROUTES.DASHBOARD.replace(':dashboardId', dashboardId);

		const contexts = getAutoContexts(pathname, '');

		expect(contexts).toStrictEqual([
			{
				source: 'auto',
				type: 'dashboard',
				resourceId: dashboardId,
				metadata: {
					page: 'dashboard_detail',
				},
			},
		]);
	});

	it('returns empty array on alert overview without ruleId', () => {
		const contexts = getAutoContexts(ROUTES.ALERT_OVERVIEW, '');

		expect(contexts).toStrictEqual([]);
	});

	it('emits no auto-context on /home (no attachable resource)', () => {
		expect(getAutoContexts(ROUTES.HOME, '')).toStrictEqual([]);
	});

	it('emits no auto-context on infrastructure monitoring routes', () => {
		expect(
			getAutoContexts(ROUTES.INFRASTRUCTURE_MONITORING_BASE, ''),
		).toStrictEqual([]);

		expect(
			getAutoContexts(
				ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
				'?selectedItem=host-1',
			),
		).toStrictEqual([]);
	});

	it('decodes the serialized composite query into metadata.query', () => {
		const query = { builder: { queryData: [] } } as unknown as Query;
		const search = `?${serialize(query).toString()}`;

		const [context] = getAutoContexts(ROUTES.LOGS_EXPLORER, search);

		expect(context.metadata?.query).toStrictEqual(query);
	});

	it('omits metadata.query when no serialized query is in the URL', () => {
		// Detection no longer gates on the `compositeQuery` key — it routes
		// through `deserialize`/the adapter list — so non-query params (time
		// range, etc.) must not be mistaken for a query.
		const search = `?${QueryParams.startTime}=1700000000000&${QueryParams.endTime}=1700003600000`;

		const [context] = getAutoContexts(ROUTES.LOGS_EXPLORER, search);

		expect(context.metadata).not.toHaveProperty('query');
	});
});
