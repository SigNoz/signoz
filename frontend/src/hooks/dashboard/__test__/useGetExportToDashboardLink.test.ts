import { renderHook } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { useGetExportToDashboardLink } from '../useGetExportToDashboardLink';

const query = { id: 'q1', queryType: 'builder' } as unknown as Query;
const params = {
	dashboardId: 'dash-1',
	panelType: PANEL_TYPES.TIME_SERIES,
	query,
	widgetId: 'w1',
};

describe('useGetExportToDashboardLink', () => {
	it('builds a V2 panel/new link (ignoring widgetId)', () => {
		const { result } = renderHook(() => useGetExportToDashboardLink());
		const link = result.current(params);

		expect(link?.startsWith('/dashboard/dash-1/panel/new?')).toBe(true);
		expect(link).toContain('panelKind=signoz%2FTimeSeriesPanel');
		expect(link).not.toContain('widgetId');
		expect(link).toContain('compositeQuery=');
	});
});
