import { renderHook } from '@testing-library/react';
import { useListDashboardsForUserV2 } from 'api/generated/services/dashboard';

import { useExportDashboards } from '../useExportDashboards';

jest.mock('api/generated/services/dashboard', () => ({
	useListDashboardsForUserV2: jest.fn(),
}));

const mockUseListV2 = useListDashboardsForUserV2 as jest.Mock;

const v2Refetch = jest.fn();

beforeEach(() => {
	jest.clearAllMocks();
	mockUseListV2.mockReturnValue({
		data: {
			data: {
				dashboards: [
					{
						id: 'v2-1',
						name: 'V2 Dashboard',
						spec: { display: { name: 'V2 Dashboard' } },
					},
				],
			},
		},
		isLoading: false,
		isFetching: false,
		refetch: v2Refetch,
	});
});

describe('useExportDashboards', () => {
	it('returns the V2 list normalized to the export shape', () => {
		const { result } = renderHook(() => useExportDashboards());

		expect(result.current.dashboards).toStrictEqual([
			{ id: 'v2-1', title: 'V2 Dashboard' },
		]);
		expect(mockUseListV2).toHaveBeenCalledWith(
			expect.objectContaining({ query: undefined }),
			expect.objectContaining({
				query: { keepPreviousData: true },
			}),
		);
	});

	it('passes the search term as a name-contains filter clause to the V2 query param', () => {
		renderHook(() => useExportDashboards('payments'));

		expect(mockUseListV2).toHaveBeenCalledWith(
			expect.objectContaining({ query: "name CONTAINS 'payments'" }),
			expect.anything(),
		);
	});

	it('refetches the V2 source', () => {
		const { result } = renderHook(() => useExportDashboards());

		result.current.refetch();
		expect(v2Refetch).toHaveBeenCalledTimes(1);
	});
});
