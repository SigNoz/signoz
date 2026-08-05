import { renderHook } from '@testing-library/react';

import { useDashboardFetchRequired } from '../useDashboardFetchRequired';

const mockUseGetDashboardV2 = jest.fn();

jest.mock(
	'pages/DashboardPageV2/DashboardContainer/store/useDashboardStore',
	() => ({
		useDashboardStore: (
			selector: (s: { dashboardId: string }) => unknown,
		): unknown => selector({ dashboardId: 'dash-1' }),
	}),
);

jest.mock('api/generated/services/dashboard', () => ({
	useGetDashboardV2: (): unknown => mockUseGetDashboardV2(),
}));

describe('useDashboardFetchRequired', () => {
	it('returns the loaded dashboard and its variables', () => {
		const dashboard = {
			spec: { variables: [{ name: 'region' }, { name: 'tier' }] },
		};
		mockUseGetDashboardV2.mockReturnValue({ data: { data: dashboard } });

		const { result } = renderHook(() => useDashboardFetchRequired());

		expect(result.current.dashboard).toBe(dashboard);
		expect(result.current.variables).toStrictEqual([
			{ name: 'region' },
			{ name: 'tier' },
		]);
	});

	it('normalizes variables to an empty array when the spec has none', () => {
		mockUseGetDashboardV2.mockReturnValue({ data: { data: { spec: {} } } });

		const { result } = renderHook(() => useDashboardFetchRequired());

		expect(result.current.variables).toStrictEqual([]);
	});

	it('throws when used outside a loaded dashboard subtree', () => {
		mockUseGetDashboardV2.mockReturnValue({ data: undefined });

		// Suppress React's expected render-error logging for this case.
		const consoleError = jest
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);

		expect(() => renderHook(() => useDashboardFetchRequired())).toThrow(
			/outside a loaded dashboard subtree/,
		);

		consoleError.mockRestore();
	});
});
