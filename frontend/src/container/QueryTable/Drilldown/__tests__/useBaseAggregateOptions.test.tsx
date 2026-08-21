import { renderHook, waitFor } from '@testing-library/react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import useBaseAggregateOptions from '../useBaseAggregateOptions';

const mockGetUpdatedQuery = jest.fn();
const mockNotificationsError = jest.fn();

jest.mock('container/GridCardLayout/useResolveQuery', () => ({
	__esModule: true,
	default: (): unknown => ({
		getUpdatedQuery: mockGetUpdatedQuery,
		isLoading: false,
	}),
}));

jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): unknown => ({
		notifications: { error: mockNotificationsError },
	}),
}));

jest.mock('hooks/dashboard/useContextVariables', () => ({
	__esModule: true,
	default: (): unknown => ({ processedVariables: {} }),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): unknown => ({ safeNavigate: jest.fn() }),
}));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
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
			onClose: jest.fn(),
			subMenu: '',
			setSubMenu: jest.fn(),
			aggregateData: AGGREGATE_DATA,
			fieldVariables: {},
		}),
	);

describe('useBaseAggregateOptions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
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
