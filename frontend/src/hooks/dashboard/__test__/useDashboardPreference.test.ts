import { act, renderHook } from '@testing-library/react';
import { LOCALSTORAGE } from 'constants/localStorage';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

import { useDashboardPreference } from '../useDashboardPreference';

const STORAGE_KEY = LOCALSTORAGE.DASHBOARD_PREFERENCES;
const DEFAULT_MODE = DashboardCursorSync.Crosshair;

const seedStore = (store: Record<string, unknown>): void => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const readStore = (): Record<string, unknown> => {
	const raw = localStorage.getItem(STORAGE_KEY);
	return raw ? JSON.parse(raw) : {};
};

describe('useDashboardPreference', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('returns the default value when no preference is stored', () => {
		const { result } = renderHook(() =>
			useDashboardPreference('dash-1', 'cursorSyncMode', DEFAULT_MODE),
		);

		expect(result.current[0]).toBe(DEFAULT_MODE);
	});

	it('returns the default value when dashboardId is undefined', () => {
		seedStore({ 'dash-1': { cursorSyncMode: DashboardCursorSync.Tooltip } });

		const { result } = renderHook(() =>
			useDashboardPreference(undefined, 'cursorSyncMode', DEFAULT_MODE),
		);

		expect(result.current[0]).toBe(DEFAULT_MODE);
	});

	it('returns the stored value for the given dashboardId', () => {
		seedStore({
			'dash-1': { cursorSyncMode: DashboardCursorSync.Tooltip },
			'dash-2': { cursorSyncMode: DashboardCursorSync.None },
		});

		const { result } = renderHook(() =>
			useDashboardPreference('dash-1', 'cursorSyncMode', DEFAULT_MODE),
		);

		expect(result.current[0]).toBe(DashboardCursorSync.Tooltip);
	});

	it('persists the new value to localStorage when the setter is called', () => {
		const { result } = renderHook(() =>
			useDashboardPreference('dash-1', 'cursorSyncMode', DEFAULT_MODE),
		);

		act(() => {
			result.current[1](DashboardCursorSync.None);
		});

		expect(result.current[0]).toBe(DashboardCursorSync.None);
		expect(readStore()).toStrictEqual({
			'dash-1': { cursorSyncMode: DashboardCursorSync.None },
		});
	});

	it('does not write to localStorage when dashboardId is undefined', () => {
		const { result } = renderHook(() =>
			useDashboardPreference(undefined, 'cursorSyncMode', DEFAULT_MODE),
		);

		act(() => {
			result.current[1](DashboardCursorSync.Tooltip);
		});

		expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
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
		seedStore({
			'dash-2': { cursorSyncMode: DashboardCursorSync.Tooltip },
		});

		const { result } = renderHook(() =>
			useDashboardPreference('dash-1', 'cursorSyncMode', DEFAULT_MODE),
		);

		act(() => {
			result.current[1](DashboardCursorSync.None);
		});

		expect(readStore()).toStrictEqual({
			'dash-1': { cursorSyncMode: DashboardCursorSync.None },
			'dash-2': { cursorSyncMode: DashboardCursorSync.Tooltip },
		});
	});

	it('returns the default value when localStorage contains malformed JSON', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
		localStorage.setItem(STORAGE_KEY, '{not-json');

		const { result } = renderHook(() =>
			useDashboardPreference('dash-1', 'cursorSyncMode', DEFAULT_MODE),
		);

		expect(result.current[0]).toBe(DEFAULT_MODE);
		expect(warnSpy).toHaveBeenCalled();
		warnSpy.mockRestore();
	});

	it('returns the default value when the stored payload is not an object', () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify('a-string'));

		const { result } = renderHook(() =>
			useDashboardPreference('dash-1', 'cursorSyncMode', DEFAULT_MODE),
		);

		expect(result.current[0]).toBe(DEFAULT_MODE);
	});

	it('reacts to a native storage event from another tab', () => {
		const { result } = renderHook(() =>
			useDashboardPreference('dash-1', 'cursorSyncMode', DEFAULT_MODE),
		);

		expect(result.current[0]).toBe(DEFAULT_MODE);

		act(() => {
			seedStore({ 'dash-1': { cursorSyncMode: DashboardCursorSync.Tooltip } });
			window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
		});

		expect(result.current[0]).toBe(DashboardCursorSync.Tooltip);
	});

	it('ignores storage events for unrelated keys', () => {
		const { result } = renderHook(() =>
			useDashboardPreference('dash-1', 'cursorSyncMode', DEFAULT_MODE),
		);

		act(() => {
			seedStore({ 'dash-1': { cursorSyncMode: DashboardCursorSync.Tooltip } });
			window.dispatchEvent(new StorageEvent('storage', { key: 'SOME_OTHER_KEY' }));
		});

		// No notify => snapshot unchanged for the existing subscriber.
		expect(result.current[0]).toBe(DEFAULT_MODE);
	});
});
