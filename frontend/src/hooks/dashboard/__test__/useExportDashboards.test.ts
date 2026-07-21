import { renderHook } from '@testing-library/react';
import { useListDashboardsForUserV2 } from 'api/generated/services/dashboard';
import { useGetAllDashboard } from 'hooks/dashboard/useGetAllDashboard';
import { useIsDashboardV2 } from 'hooks/useIsDashboardV2';
import { Dashboard } from 'types/api/dashboard/getAll';

import { useExportDashboards } from '../useExportDashboards';

jest.mock('hooks/useIsDashboardV2');
jest.mock('hooks/dashboard/useGetAllDashboard');
jest.mock('api/generated/services/dashboard', () => ({
	useListDashboardsForUserV2: jest.fn(),
}));

const mockUseIsDashboardV2 = useIsDashboardV2 as jest.MockedFunction<
	typeof useIsDashboardV2
>;
const mockUseGetAllDashboard = useGetAllDashboard as jest.Mock;
const mockUseListV2 = useListDashboardsForUserV2 as jest.Mock;

const v1Refetch = jest.fn();
const v2Refetch = jest.fn();

const v1Dashboard = {
	id: 'v1-1',
	data: { title: 'V1 Dashboard' },
} as unknown as Dashboard;

const v1Other = {
	id: 'v1-2',
	data: { title: 'Other board' },
} as unknown as Dashboard;

beforeEach(() => {
	jest.clearAllMocks();
	mockUseGetAllDashboard.mockReturnValue({
		data: { data: [v1Dashboard, v1Other] },
		isLoading: false,
		isFetching: false,
		refetch: v1Refetch,
	});
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
	it('returns the V1 list and disables the V2 query when the flag is off', () => {
		mockUseIsDashboardV2.mockReturnValue(false);

		const { result } = renderHook(() => useExportDashboards());

		expect(result.current.dashboards).toStrictEqual([
			{ id: 'v1-1', title: 'V1 Dashboard' },
			{ id: 'v1-2', title: 'Other board' },
		]);
		expect(mockUseGetAllDashboard).toHaveBeenCalledWith({ enabled: true });
		expect(mockUseListV2).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				query: { enabled: false, keepPreviousData: true },
			}),
		);
	});

	it('filters the V1 list in memory by title (case-insensitive)', () => {
		mockUseIsDashboardV2.mockReturnValue(false);

		const { result } = renderHook(() => useExportDashboards('v1 dash'));

		expect(result.current.dashboards).toStrictEqual([
			{ id: 'v1-1', title: 'V1 Dashboard' },
		]);
	});

	it('returns the V2 list normalized to the export shape when the flag is on', () => {
		mockUseIsDashboardV2.mockReturnValue(true);

		const { result } = renderHook(() => useExportDashboards());

		expect(result.current.dashboards).toStrictEqual([
			{ id: 'v2-1', title: 'V2 Dashboard' },
		]);
		expect(mockUseGetAllDashboard).toHaveBeenCalledWith({ enabled: false });
		expect(mockUseListV2).toHaveBeenCalledWith(
			expect.objectContaining({ query: undefined }),
			expect.objectContaining({
				query: { enabled: true, keepPreviousData: true },
			}),
		);
	});

	it('passes the search term as a name-contains filter clause to the V2 query param', () => {
		mockUseIsDashboardV2.mockReturnValue(true);

		renderHook(() => useExportDashboards('payments'));

		expect(mockUseListV2).toHaveBeenCalledWith(
			expect.objectContaining({ query: "name CONTAINS 'payments'" }),
			expect.anything(),
		);
	});

	it('refetches the active source', () => {
		mockUseIsDashboardV2.mockReturnValue(true);
		const { result } = renderHook(() => useExportDashboards());

		result.current.refetch();
		expect(v2Refetch).toHaveBeenCalledTimes(1);
		expect(v1Refetch).not.toHaveBeenCalled();
	});
});
