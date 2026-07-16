import { renderHook } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useIsDashboardV2 } from 'hooks/useIsDashboardV2';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { useGetExportToDashboardLink } from '../useGetExportToDashboardLink';

jest.mock('hooks/useIsDashboardV2');
const mockUseIsDashboardV2 = useIsDashboardV2 as jest.MockedFunction<
	typeof useIsDashboardV2
>;

const query = { id: 'q1', queryType: 'builder' } as unknown as Query;
const params = {
	dashboardId: 'dash-1',
	panelType: PANEL_TYPES.TIME_SERIES,
	query,
	widgetId: 'w1',
};

describe('useGetExportToDashboardLink', () => {
	it('builds a V1 new-widget link when the dashboard-v2 flag is off', () => {
		mockUseIsDashboardV2.mockReturnValue(false);

		const { result } = renderHook(() => useGetExportToDashboardLink());
		const link = result.current(params);

		expect(link?.startsWith('/dashboard/dash-1/new?')).toBe(true);
		expect(link).toContain('graphType=');
		expect(link).toContain('widgetId=w1');
		expect(link).toContain('compositeQuery=');
	});

	it('builds a V2 panel/new link (ignoring widgetId) when the flag is on', () => {
		mockUseIsDashboardV2.mockReturnValue(true);

		const { result } = renderHook(() => useGetExportToDashboardLink());
		const link = result.current(params);

		expect(link?.startsWith('/dashboard/dash-1/panel/new?')).toBe(true);
		expect(link).toContain('panelKind=signoz%2FTimeSeriesPanel');
		expect(link).not.toContain('widgetId');
		expect(link).toContain('compositeQuery=');
	});
});
