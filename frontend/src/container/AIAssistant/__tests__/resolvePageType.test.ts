import { PageTypeDTO } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';

import { resolvePageType } from '../resolvePageType';

describe('resolvePageType', () => {
	it('returns other for the standalone assistant surface', () => {
		expect(
			resolvePageType('/services', '', { isStandaloneAssistant: true }),
		).toBe(PageTypeDTO.other);
	});

	it('returns dashboard_detail on a dashboard page', () => {
		const pathname = ROUTES.DASHBOARD.replace(':dashboardId', 'dash-123');

		expect(resolvePageType(pathname, '')).toBe(PageTypeDTO.dashboard_detail);
	});

	it('returns alerts_triggered on alert history without ruleId', () => {
		expect(resolvePageType(ROUTES.ALERT_HISTORY, '')).toBe(
			PageTypeDTO.alerts_triggered,
		);
	});

	it('resolves alert list tabs on /alerts', () => {
		expect(resolvePageType(ROUTES.LIST_ALL_ALERT, '')).toBe(
			PageTypeDTO.alert_list,
		);
		expect(resolvePageType(ROUTES.LIST_ALL_ALERT, '?tab=AlertRules')).toBe(
			PageTypeDTO.alert_list,
		);
		expect(resolvePageType(ROUTES.LIST_ALL_ALERT, '?tab=TriggeredAlerts')).toBe(
			PageTypeDTO.alerts_triggered,
		);
		expect(resolvePageType(ROUTES.LIST_ALL_ALERT, '?tab=Configuration')).toBe(
			PageTypeDTO.alert_list,
		);
	});

	it('returns log_detail when logs explorer has activeLogId', () => {
		const search = `?${QueryParams.activeLogId}=log-1`;

		expect(resolvePageType(ROUTES.LOGS_EXPLORER, search)).toBe(
			PageTypeDTO.log_detail,
		);
	});

	it('returns other for unmapped routes', () => {
		expect(resolvePageType(ROUTES.ALERT_OVERVIEW, '')).toBe(PageTypeDTO.other);
	});

	it('returns other for the app root route (no contextual mapping)', () => {
		expect(resolvePageType(ROUTES.HOME_PAGE, '')).toBe(PageTypeDTO.other);
	});

	it('returns homepage on /home', () => {
		expect(resolvePageType(ROUTES.HOME, '')).toBe(PageTypeDTO.homepage);
	});

	it('returns infra_entity_detail on infrastructure monitoring routes', () => {
		expect(resolvePageType(ROUTES.INFRASTRUCTURE_MONITORING_BASE, '')).toBe(
			PageTypeDTO.infra_entity_detail,
		);
		expect(resolvePageType(ROUTES.INFRASTRUCTURE_MONITORING_HOSTS, '')).toBe(
			PageTypeDTO.infra_entity_detail,
		);
		expect(resolvePageType(ROUTES.INFRASTRUCTURE_MONITORING_KUBERNETES, '')).toBe(
			PageTypeDTO.infra_entity_detail,
		);
	});

	it('returns metrics_explorer on all metrics explorer routes', () => {
		expect(resolvePageType(ROUTES.METRICS_EXPLORER_BASE, '')).toBe(
			PageTypeDTO.metrics_explorer,
		);
		expect(resolvePageType(ROUTES.METRICS_EXPLORER, '')).toBe(
			PageTypeDTO.metrics_explorer,
		);
		expect(resolvePageType(ROUTES.METRICS_EXPLORER_EXPLORER, '')).toBe(
			PageTypeDTO.metrics_explorer,
		);
		expect(resolvePageType(ROUTES.METRICS_EXPLORER_VIEWS, '')).toBe(
			PageTypeDTO.metrics_explorer,
		);
	});
});
