import { renderHook } from '@testing-library/react';

import { useContextLinkVariables } from '../useContextLinkVariables';

const mockUseDashboardVariableNames = jest.fn();
const mockUseQueryBuilder = jest.fn();

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): unknown => mockUseQueryBuilder(),
}));

jest.mock(
	'pages/DashboardPage/DashboardContainer/hooks/useDashboardVariableNames',
	() => ({
		useDashboardVariableNames: (): unknown => mockUseDashboardVariableNames(),
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
		mockUseDashboardVariableNames.mockReturnValue(['region', 'tier']);
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
		mockUseDashboardVariableNames.mockReturnValue([]);

		const { result } = renderHook(() => useContextLinkVariables());

		expect(result.current).toStrictEqual([
			{ name: 'timestamp_start', source: 'Global timestamp' },
			{ name: 'timestamp_end', source: 'Global timestamp' },
		]);
	});
});
