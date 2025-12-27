import { act, renderHook } from '@testing-library/react';
import { prepareQueryRangePayloadV5 } from 'api/v5/v5';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { createMemoryHistory, MemoryHistory } from 'history';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import history from 'lib/history';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import configureStore, { MockStoreEnhanced } from 'redux-mock-store';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { getGraphType } from 'utils/getGraphType';

import useCreateAlerts from '../useCreateAlerts';

jest.mock('api/dashboard/substitute_vars');
jest.mock('api/v5/v5');
jest.mock('lib/history');
jest.mock('lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi');
jest.mock('utils/getGraphType');
jest.mock('lib/dashbaordVariables/getDashboardVariables');

const mockPrepareQueryRangePayloadV5 = prepareQueryRangePayloadV5 as jest.MockedFunction<
	typeof prepareQueryRangePayloadV5
>;
const mockHistoryPush = history.push as jest.MockedFunction<
	typeof history.push
>;
const mockMapQueryDataFromApi = mapQueryDataFromApi as jest.MockedFunction<
	typeof mapQueryDataFromApi
>;
const mockGetGraphType = getGraphType as jest.MockedFunction<
	typeof getGraphType
>;
const mockGetDashboardVariables = getDashboardVariables as jest.MockedFunction<
	typeof getDashboardVariables
>;

const mockNotifications = {
	error: jest.fn(),
};
jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): { notifications: typeof mockNotifications } => ({
		notifications: mockNotifications,
	}),
}));

const mockSelectedDashboard: Partial<Dashboard> = {
	id: 'dashboard-123',
	data: {
		title: 'Test Dashboard',
		variables: {},
		version: 'v5',
	},
};
jest.mock('providers/Dashboard/Dashboard', () => ({
	useDashboard: (): { selectedDashboard: Partial<Dashboard> } => ({
		selectedDashboard: mockSelectedDashboard,
	}),
}));

const mockGlobalTime = {
	selectedTime: {
		startTime: 1713734400000,
		endTime: 1713738000000,
	},
};
jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useSelector: (): typeof mockGlobalTime => mockGlobalTime,
}));

const mockMutate = jest.fn();
jest.mock('react-query', () => ({
	...jest.requireActual('react-query'),
	useMutation: (): { mutate: VoidFunction } => ({ mutate: mockMutate }),
}));

const mockWidget: Partial<Widgets> = {
	id: 'widget-123',
	panelTypes: PANEL_TYPES.TIME_SERIES,
	query: {
		queryType: EQueryType.QUERY_BUILDER,
		builder: {
			queryData: [],
			queryFormulas: [],
			queryTraceOperator: [],
		},
		promql: [],
		clickhouse_sql: [],
		id: 'query-123',
	},
	timePreferance: 'GLOBAL_TIME',
};

const mockStore = configureStore([]);

describe('useCreateAlerts', () => {
	let queryClient: QueryClient;
	let historyInstance: MemoryHistory;
	let store: MockStoreEnhanced;

	beforeEach(() => {
		jest.clearAllMocks();
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		historyInstance = createMemoryHistory();
		store = mockStore({
			globalTime: mockGlobalTime,
		}) as MockStoreEnhanced;

		mockGetGraphType.mockReturnValue(PANEL_TYPES.TIME_SERIES);
		mockGetDashboardVariables.mockReturnValue({});
		mockPrepareQueryRangePayloadV5.mockReturnValue(({
			queryPayload: { test: 'payload' },
			legendMap: {},
		} as unknown) as ReturnType<typeof prepareQueryRangePayloadV5>);
		mockMapQueryDataFromApi.mockReturnValue({
			queryType: EQueryType.QUERY_BUILDER,
			builder: {
				queryData: [],
				queryFormulas: [],
				queryTraceOperator: [],
			},
			promql: [],
			clickhouse_sql: [],
			id: 'query-123',
		} as Query);
	});

	const renderUseCreateAlerts = (
		widget?: Widgets,
		caller?: string,
		thresholds?: ThresholdProps[],
	): ReturnType<typeof renderHook> =>
		renderHook(() => useCreateAlerts(widget, caller, thresholds), {
			wrapper: ({ children }) => (
				<Provider store={store}>
					<QueryClientProvider client={queryClient}>
						<Router history={historyInstance}>{children}</Router>
					</QueryClientProvider>
				</Provider>
			),
		});

	it('should return with no action when widget is not provided', () => {
		const { result } = renderUseCreateAlerts();

		act(() => {
			(result.current as () => void)();
		});

		expect(mockPrepareQueryRangePayloadV5).not.toHaveBeenCalled();
		expect(mockMutate).not.toHaveBeenCalled();
	});

	it('should prepare query payload and call mutation', () => {
		const { result } = renderUseCreateAlerts(mockWidget as Widgets);

		act(() => {
			(result.current as () => void)();
		});

		expect(mockPrepareQueryRangePayloadV5).toHaveBeenCalledWith({
			query: mockWidget.query,
			globalSelectedInterval: mockGlobalTime.selectedTime,
			graphType: PANEL_TYPES.TIME_SERIES,
			selectedTime: mockWidget.timePreferance,
			variables: {},
			originalGraphType: mockWidget.panelTypes,
			dynamicVariables: [],
		});

		expect(mockMutate).toHaveBeenCalledWith(
			{ test: 'payload' },
			expect.objectContaining({
				onSuccess: expect.any(Function),
				onError: expect.any(Function),
			}),
		);
	});

	const simulateMutationSuccess = (): void => {
		const mutateCall = mockMutate.mock.calls[0];
		if (mutateCall?.[1]?.onSuccess) {
			act(() => {
				mutateCall[1].onSuccess({
					data: { compositeQuery: { test: 'query' } },
				});
			});
		}
	};

	it('should navigate to alerts page with correct URL on success', () => {
		const thresholds: Partial<ThresholdProps>[] = [
			{
				thresholdOperator: '>',
				thresholdValue: 100,
				thresholdUnit: 'ms',
				thresholdLabel: 'High',
				thresholdColor: '#ff0000',
				setThresholds: jest.fn(),
			},
		];
		const { result } = renderUseCreateAlerts(
			mockWidget as Widgets,
			undefined,
			thresholds as ThresholdProps[],
		);

		act(() => {
			(result.current as () => void)();
		});

		simulateMutationSuccess();

		const [url, state] = mockHistoryPush.mock.calls[0];
		expect(url).toContain(ROUTES.ALERTS_NEW);
		expect(url).toContain(QueryParams.compositeQuery);
		expect(url).toContain(QueryParams.panelTypes);
		expect(url).toContain(ENTITY_VERSION_V5);
		expect(state).toEqual({
			thresholds: [
				{
					thresholdOperator: '>',
					thresholdValue: 100,
					thresholdUnit: 'ms',
					thresholdLabel: 'High',
					thresholdColor: '#ff0000',
				},
			],
		});
	});

	it('should show error notification on mutation failure', () => {
		const { result } = renderUseCreateAlerts(mockWidget as Widgets);

		act(() => {
			(result.current as () => void)();
		});

		const mutateCall = mockMutate.mock.calls[0];
		if (mutateCall?.[1]?.onError) {
			act(() => {
				mutateCall[1].onError(new Error('Test error'));
			});
		}

		expect(mockNotifications.error).toHaveBeenCalledWith({
			message: SOMETHING_WENT_WRONG,
		});
		expect(mockHistoryPush).not.toHaveBeenCalled();
	});
});
