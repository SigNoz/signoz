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

	it('returns log_detail when logs explorer has activeLogId', () => {
		const search = `?${QueryParams.activeLogId}=log-1`;

		expect(resolvePageType(ROUTES.LOGS_EXPLORER, search)).toBe(
			PageTypeDTO.log_detail,
		);
	});

	it('returns other for unmapped routes', () => {
		expect(resolvePageType(ROUTES.ALERT_OVERVIEW, '')).toBe(PageTypeDTO.other);
	});

	it('returns other for the app home route (no contextual mapping)', () => {
		expect(resolvePageType(ROUTES.HOME_PAGE, '')).toBe(PageTypeDTO.other);
	});
});
