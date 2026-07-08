import { renderHook } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { useSwitchToViewMode } from '../useSwitchToViewMode';

const mockSafeNavigate = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

let mockSearch = '';
jest.mock('hooks/useUrlQuery', () => ({
	__esModule: true,
	default: (): URLSearchParams => new URLSearchParams(mockSearch),
}));

const query = { queryType: 'builder' } as unknown as Query;

describe('useSwitchToViewMode', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSearch = '';
	});

	function invoke(): void {
		const { result } = renderHook(() =>
			useSwitchToViewMode({
				dashboardId: 'dash-1',
				panelId: 'panel-1',
				panelType: PANEL_TYPES.TIME_SERIES,
				query,
			}),
		);
		result.current();
	}

	it('opens the dashboard with the View modal seeded from the live query', () => {
		invoke();

		expect(mockSafeNavigate).toHaveBeenCalledTimes(1);
		const target = new URL(mockSafeNavigate.mock.calls[0][0], 'http://x');
		expect(target.pathname).toBe('/dashboard/dash-1');
		expect(target.searchParams.get('expandedWidgetId')).toBe('panel-1');
		expect(target.searchParams.get('graphType')).toBe(PANEL_TYPES.TIME_SERIES);
		expect(
			JSON.parse(
				decodeURIComponent(target.searchParams.get('compositeQuery') || ''),
			),
		).toStrictEqual(query);
	});

	it('carries dashboard variables through and drops other editor URL state', () => {
		mockSearch = 'variables=%7B%22a%22%3A1%7D&compositeQuery=stale';
		invoke();

		const target = new URL(mockSafeNavigate.mock.calls[0][0], 'http://x');
		expect(target.searchParams.get('variables')).toBe('{"a":1}');
		// The stale editor query is replaced with the live one, not the URL leftover.
		expect(target.searchParams.get('compositeQuery')).not.toBe('stale');
	});
});
