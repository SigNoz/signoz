import { act, renderHook } from '@testing-library/react';
import { LOCALSTORAGE } from 'constants/localStorage';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

import { useDashboardCursorSyncMode } from '../useDashboardCursorSyncMode';
import { useDashboardPreferencesStore } from '../useDashboardPreference';

const STORAGE_KEY = LOCALSTORAGE.DASHBOARD_PREFERENCES;

describe('useDashboardCursorSyncMode', () => {
	beforeEach(() => {
		useDashboardPreferencesStore.setState({ preferences: {} });
		localStorage.removeItem(STORAGE_KEY);
	});

	describe('in DASHBOARD_VIEW mode', () => {
		it('uses Crosshair as the default cursor sync mode', () => {
			const { result } = renderHook(() =>
				useDashboardCursorSyncMode('dash-1', PanelMode.DASHBOARD_VIEW),
			);

			expect(result.current[0]).toBe(DashboardCursorSync.Crosshair);
		});

		it('reads the stored cursor sync mode for the dashboard', () => {
			useDashboardPreferencesStore.setState({
				preferences: { 'dash-1': { cursorSyncMode: DashboardCursorSync.Tooltip } },
			});

			const { result } = renderHook(() =>
				useDashboardCursorSyncMode('dash-1', PanelMode.DASHBOARD_VIEW),
			);

			expect(result.current[0]).toBe(DashboardCursorSync.Tooltip);
		});

		it('writes the value under the cursorSyncMode key in the store', () => {
			const { result } = renderHook(() =>
				useDashboardCursorSyncMode('dash-1', PanelMode.DASHBOARD_VIEW),
			);

			act(() => {
				result.current[1](DashboardCursorSync.None);
			});

			expect(result.current[0]).toBe(DashboardCursorSync.None);
			expect(useDashboardPreferencesStore.getState().preferences).toStrictEqual({
				'dash-1': { cursorSyncMode: DashboardCursorSync.None },
			});
		});

		it('persists the value to localStorage', () => {
			const { result } = renderHook(() =>
				useDashboardCursorSyncMode('dash-1', PanelMode.DASHBOARD_VIEW),
			);

			act(() => {
				result.current[1](DashboardCursorSync.None);
			});

			const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
			expect(persisted.state.preferences).toStrictEqual({
				'dash-1': { cursorSyncMode: DashboardCursorSync.None },
			});
		});

		it('returns the default when dashboardId is undefined', () => {
			const { result } = renderHook(() =>
				useDashboardCursorSyncMode(undefined, PanelMode.DASHBOARD_VIEW),
			);

			expect(result.current[0]).toBe(DashboardCursorSync.Crosshair);
		});

		it('treats the setter as a no-op when dashboardId is undefined', () => {
			const { result } = renderHook(() =>
				useDashboardCursorSyncMode(undefined, PanelMode.DASHBOARD_VIEW),
			);

			act(() => {
				result.current[1](DashboardCursorSync.Tooltip);
			});

			expect(useDashboardPreferencesStore.getState().preferences).toStrictEqual(
				{},
			);
			expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
			expect(result.current[0]).toBe(DashboardCursorSync.Crosshair);
		});
	});

	describe('without a panelMode (e.g. dashboard settings call site)', () => {
		it('reads the stored value just like DASHBOARD_VIEW does', () => {
			useDashboardPreferencesStore.setState({
				preferences: { 'dash-1': { cursorSyncMode: DashboardCursorSync.Tooltip } },
			});

			const { result } = renderHook(() => useDashboardCursorSyncMode('dash-1'));

			expect(result.current[0]).toBe(DashboardCursorSync.Tooltip);
		});

		it('writes through the setter to the store', () => {
			const { result } = renderHook(() => useDashboardCursorSyncMode('dash-1'));

			act(() => {
				result.current[1](DashboardCursorSync.None);
			});

			expect(result.current[0]).toBe(DashboardCursorSync.None);
			expect(useDashboardPreferencesStore.getState().preferences).toStrictEqual({
				'dash-1': { cursorSyncMode: DashboardCursorSync.None },
			});
		});
	});

	describe.each([[PanelMode.DASHBOARD_EDIT], [PanelMode.STANDALONE_VIEW]])(
		'in %s mode (cursor sync disabled)',
		(panelMode) => {
			it('returns the Crosshair default and ignores any stored value', () => {
				useDashboardPreferencesStore.setState({
					preferences: { 'dash-1': { cursorSyncMode: DashboardCursorSync.Tooltip } },
				});

				const { result } = renderHook(() =>
					useDashboardCursorSyncMode('dash-1', panelMode),
				);

				expect(result.current[0]).toBe(DashboardCursorSync.Crosshair);
			});

			it('treats the setter as a no-op and does not write to the store', () => {
				const { result } = renderHook(() =>
					useDashboardCursorSyncMode('dash-1', panelMode),
				);

				act(() => {
					result.current[1](DashboardCursorSync.None);
				});

				expect(useDashboardPreferencesStore.getState().preferences).toStrictEqual(
					{},
				);
				expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
				expect(result.current[0]).toBe(DashboardCursorSync.Crosshair);
			});
		},
	);
});
