import { renderHook } from '@testing-library/react';

import { useContextLinkVariables } from '../useContextLinkVariables';

const mockUseGetDashboardV2 = vi.fn();
const mockUseQueryBuilder = vi.fn();

vi.mock(
	'pages/DashboardPage/DashboardContainer/store/useDashboardStore',
	() => ({
		useDashboardStore: (
			selector: (s: { dashboardId: string }) => unknown,
		): unknown => selector({ dashboardId: 'dash-1' }),
	}),
);

vi.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): unknown => mockUseQueryBuilder(),
}));

vi.mock('api/generated/services/dashboard', () => ({
	useGetDashboardV2: (): unknown => mockUseGetDashboardV2(),
}));

// dtoToFormModel is exercised by its own suite; here we only need it to surface a name.
vi.mock(
	'pages/DashboardPage/DashboardContainer/DashboardSettings/Variables/variableAdapters',
	() => ({
		dtoToFormModel: (dto: { name: string }): { name: string } => ({
			name: dto.name,
		}),
	}),
);

describe('useContextLinkVariables', () => {
	beforeEach(() => {
		mockUseQueryBuilder.mockReturnValue({
			currentQuery: {
				builder: {
					queryData: [
						{ groupBy: [{ key: 'service.name' }, { key: 'env' }] },
						// Duplicate across queries — must dedupe.
						{ groupBy: [{ key: 'service.name' }] },
					],
				},
			},
		});
		mockUseGetDashboardV2.mockReturnValue({
			data: {
				data: { spec: { variables: [{ name: 'region' }, { name: 'tier' }] } },
			},
		});
	});

	it('orders globals, then _prefixed query fields (deduped), then dashboard vars', () => {
		const { result } = renderHook(() => useContextLinkVariables());

		expect(result.current).toStrictEqual([
			{ name: 'timestamp_start', source: 'Global timestamp' },
			{ name: 'timestamp_end', source: 'Global timestamp' },
			{ name: '_service.name', source: 'Query variable' },
			{ name: '_env', source: 'Query variable' },
			{ name: 'region', source: 'Dashboard variable' },
			{ name: 'tier', source: 'Dashboard variable' },
		]);
	});

	it('still returns the global timestamps when there are no queries or variables', () => {
		mockUseQueryBuilder.mockReturnValue({
			currentQuery: { builder: { queryData: [] } },
		});
		// Loaded dashboard with no variables — useDashboardFetchRequired guarantees the
		// dashboard is present, so the empty case is an empty spec, not `undefined`.
		mockUseGetDashboardV2.mockReturnValue({ data: { data: { spec: {} } } });

		const { result } = renderHook(() => useContextLinkVariables());

		expect(result.current).toStrictEqual([
			{ name: 'timestamp_start', source: 'Global timestamp' },
			{ name: 'timestamp_end', source: 'Global timestamp' },
		]);
	});
});
