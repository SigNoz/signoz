import { act, renderHook } from '@testing-library/react';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

import {
	useDashboardPreference,
	useDashboardPreferencesStore,
} from '../useDashboardPreference';

const DEFAULT_MODE = DashboardCursorSync.Crosshair;

describe('useDashboardPreference', () => {
	beforeEach(() => {
		useDashboardPreferencesStore.setState({ preferences: {} });
	});

	it('returns the default value when no preference is stored', () => {
		const { result } = renderHook(() =>
			useDashboardPreference('dash-1', 'cursorSyncMode', DEFAULT_MODE),
		);

		expect(result.current[0]).toBe(DEFAULT_MODE);
	});

	it('returns the default value when dashboardId is undefined', () => {
		useDashboardPreferencesStore.setState({
			preferences: { 'dash-1': { cursorSyncMode: DashboardCursorSync.Tooltip } },
		});

		const { result } = renderHook(() =>
			useDashboardPreference(undefined, 'cursorSyncMode', DEFAULT_MODE),
		);

		expect(result.current[0]).toBe(DEFAULT_MODE);
	});

	it('returns the stored value for the given dashboardId', () => {
		useDashboardPreferencesStore.setState({
			preferences: {
				'dash-1': { cursorSyncMode: DashboardCursorSync.Tooltip },
				'dash-2': { cursorSyncMode: DashboardCursorSync.None },
			},
		});

		const { result } = renderHook(() =>
			useDashboardPreference('dash-1', 'cursorSyncMode', DEFAULT_MODE),
		);

		expect(result.current[0]).toBe(DashboardCursorSync.Tooltip);
	});

	it('persists the new value via the setter', () => {
		const { result } = renderHook(() =>
			useDashboardPreference('dash-1', 'cursorSyncMode', DEFAULT_MODE),
		);

		act(() => {
			result.current[1](DashboardCursorSync.None);
		});

		expect(result.current[0]).toBe(DashboardCursorSync.None);
		expect(useDashboardPreferencesStore.getState().preferences).toStrictEqual({
			'dash-1': { cursorSyncMode: DashboardCursorSync.None },
		});
	});

	it('does not write when dashboardId is undefined', () => {
		const { result } = renderHook(() =>
			useDashboardPreference(undefined, 'cursorSyncMode', DEFAULT_MODE),
		);

		act(() => {
			result.current[1](DashboardCursorSync.Tooltip);
		});

		expect(useDashboardPreferencesStore.getState().preferences).toStrictEqual({});
		expect(result.current[0]).toBe(DEFAULT_MODE);
	});

	it('keeps multiple hook instances in sync after a write', () => {
		const { result: writer } = renderHook(() =>
			useDashboardPreference('dash-1', 'cursorSyncMode', DEFAULT_MODE),
		);
		const { result: reader } = renderHook(() =>
			useDashboardPreference('dash-1', 'cursorSyncMode', DEFAULT_MODE),
		);

		act(() => {
			writer.current[1](DashboardCursorSync.Tooltip);
		});

		expect(writer.current[0]).toBe(DashboardCursorSync.Tooltip);
		expect(reader.current[0]).toBe(DashboardCursorSync.Tooltip);
	});

	it('isolates preferences across different dashboardIds', () => {
		const { result: dashOne } = renderHook(() =>
			useDashboardPreference('dash-1', 'cursorSyncMode', DEFAULT_MODE),
		);
		const { result: dashTwo } = renderHook(() =>
			useDashboardPreference('dash-2', 'cursorSyncMode', DEFAULT_MODE),
		);

		act(() => {
			dashOne.current[1](DashboardCursorSync.None);
		});

		expect(dashOne.current[0]).toBe(DashboardCursorSync.None);
		expect(dashTwo.current[0]).toBe(DEFAULT_MODE);
	});

	it('does not overwrite preferences for other dashboards when writing', () => {
		useDashboardPreferencesStore.setState({
			preferences: { 'dash-2': { cursorSyncMode: DashboardCursorSync.Tooltip } },
		});

		const { result } = renderHook(() =>
			useDashboardPreference('dash-1', 'cursorSyncMode', DEFAULT_MODE),
		);

		act(() => {
			result.current[1](DashboardCursorSync.None);
		});

		expect(useDashboardPreferencesStore.getState().preferences).toStrictEqual({
			'dash-1': { cursorSyncMode: DashboardCursorSync.None },
			'dash-2': { cursorSyncMode: DashboardCursorSync.Tooltip },
		});
	});
});

describe('useDashboardPreferencesStore.removePreferences', () => {
	beforeEach(() => {
		useDashboardPreferencesStore.setState({ preferences: {} });
	});

	it('removes the preferences for the given dashboardId', () => {
		useDashboardPreferencesStore.setState({
			preferences: {
				'dash-1': { cursorSyncMode: DashboardCursorSync.Tooltip },
			},
		});

		act(() => {
			useDashboardPreferencesStore.getState().removePreferences('dash-1');
		});

		expect(useDashboardPreferencesStore.getState().preferences).toStrictEqual({});
	});

	it('leaves other dashboards untouched', () => {
		useDashboardPreferencesStore.setState({
			preferences: {
				'dash-1': { cursorSyncMode: DashboardCursorSync.Tooltip },
				'dash-2': { cursorSyncMode: DashboardCursorSync.None },
			},
		});

		act(() => {
			useDashboardPreferencesStore.getState().removePreferences('dash-1');
		});

		expect(useDashboardPreferencesStore.getState().preferences).toStrictEqual({
			'dash-2': { cursorSyncMode: DashboardCursorSync.None },
		});
	});

	it('is a no-op when the dashboardId is not present', () => {
		const initial = {
			'dash-2': { cursorSyncMode: DashboardCursorSync.Tooltip },
		};
		useDashboardPreferencesStore.setState({ preferences: initial });
		const before = useDashboardPreferencesStore.getState().preferences;

		act(() => {
			useDashboardPreferencesStore.getState().removePreferences('dash-1');
		});

		// Identity-preserving so subscribers reading `preferences` don't re-render.
		expect(useDashboardPreferencesStore.getState().preferences).toBe(before);
	});

	it('causes subsequent reads via useDashboardPreference to fall back to the default', () => {
		useDashboardPreferencesStore.setState({
			preferences: {
				'dash-1': { cursorSyncMode: DashboardCursorSync.Tooltip },
			},
		});

		const { result } = renderHook(() =>
			useDashboardPreference('dash-1', 'cursorSyncMode', DEFAULT_MODE),
		);

		expect(result.current[0]).toBe(DashboardCursorSync.Tooltip);

		act(() => {
			useDashboardPreferencesStore.getState().removePreferences('dash-1');
		});

		expect(result.current[0]).toBe(DEFAULT_MODE);
	});
});
