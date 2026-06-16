import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';

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
});
