import { renderHook, waitFor } from '@testing-library/react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import useBaseAggregateOptions from '../useBaseAggregateOptions';

const { mockGetUpdatedQuery, mockNotificationsError } = vi.hoisted(() => ({
	mockGetUpdatedQuery: vi.fn(),
	mockNotificationsError: vi.fn(),
}));

vi.mock('container/WidgetCard/hooks/useResolveQuery', () => ({
	__esModule: true,
	default: (): unknown => ({
		getUpdatedQuery: mockGetUpdatedQuery,
		isLoading: false,
	}),
}));

vi.mock('hooks/useNotifications', () => ({
	useNotifications: (): unknown => ({
		notifications: { error: mockNotificationsError },
	}),
}));

vi.mock('hooks/dashboard/useContextVariables', async () => ({
	...(await vi.importActual('hooks/dashboard/useContextVariables')),
	__esModule: true,
	default: (): unknown => ({ processedVariables: {} }),
}));

vi.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): unknown => ({ safeNavigate: vi.fn() }),
}));

vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useLocation: (): { pathname: string } => ({ pathname: '/services/socky-api' }),
}));

const QUERY = {
	builder: {
		queryData: [{ queryName: 'A', dataSource: 'traces', aggregations: [] }],
	},
} as unknown as Query;

const AGGREGATE_DATA = { queryName: 'A', filters: [] };

const renderOptions = (): ReturnType<typeof renderHook> =>
	renderHook(() =>
		useBaseAggregateOptions({
			query: QUERY,
			onClose: vi.fn(),
			subMenu: '',
			setSubMenu: vi.fn(),
			aggregateData: AGGREGATE_DATA,
			fieldVariables: {},
		}),
	);

describe('useBaseAggregateOptions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('notifies and keeps the unresolved query when variable resolution fails', async () => {
		mockGetUpdatedQuery.mockRejectedValue(
			new Error('syntax errors in expression'),
		);

		renderOptions();

		await waitFor(() =>
			expect(mockNotificationsError).toHaveBeenCalledWith({
				message: 'Unable to resolve variables',
			}),
		);
	});

	it('does not notify when variable resolution succeeds', async () => {
		mockGetUpdatedQuery.mockResolvedValue(QUERY);

		renderOptions();

		await waitFor(() => expect(mockGetUpdatedQuery).toHaveBeenCalled());
		expect(mockNotificationsError).not.toHaveBeenCalled();
	});
});
