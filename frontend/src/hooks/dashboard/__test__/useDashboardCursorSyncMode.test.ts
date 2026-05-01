import { act, renderHook } from '@testing-library/react';
import { LOCALSTORAGE } from 'constants/localStorage';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

import { useDashboardCursorSyncMode } from '../useDashboardCursorSyncMode';

const STORAGE_KEY = LOCALSTORAGE.DASHBOARD_PREFERENCES;

describe('useDashboardCursorSyncMode', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('defaults to Crosshair when no value is stored', () => {
		const { result } = renderHook(() => useDashboardCursorSyncMode('dash-1'));

		expect(result.current[0]).toBe(DashboardCursorSync.Crosshair);
	});

	it('reads the stored cursor sync mode for the dashboard', () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				'dash-1': { cursorSyncMode: DashboardCursorSync.Tooltip },
			}),
		);

		const { result } = renderHook(() => useDashboardCursorSyncMode('dash-1'));

		expect(result.current[0]).toBe(DashboardCursorSync.Tooltip);
	});

	it('persists the cursor sync mode under the cursorSyncMode key', () => {
		const { result } = renderHook(() => useDashboardCursorSyncMode('dash-1'));

		act(() => {
			result.current[1](DashboardCursorSync.None);
		});

		expect(result.current[0]).toBe(DashboardCursorSync.None);
		expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toStrictEqual({
			'dash-1': { cursorSyncMode: DashboardCursorSync.None },
		});
	});

	it('returns the default when dashboardId is undefined and the setter is a no-op', () => {
		const { result } = renderHook(() => useDashboardCursorSyncMode(undefined));

		expect(result.current[0]).toBe(DashboardCursorSync.Crosshair);

		act(() => {
			result.current[1](DashboardCursorSync.Tooltip);
		});

		expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
		expect(result.current[0]).toBe(DashboardCursorSync.Crosshair);
	});
});
