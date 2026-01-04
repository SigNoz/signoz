import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { AppContext } from 'providers/App/App';
import { IAppContext } from 'providers/App/types';
import React, { MutableRefObject } from 'react';
import { QueryClient, QueryClientProvider, UseQueryResult } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { SuccessResponse, Warning } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { EQueryType } from 'types/common/dashboard';
import { ROLES } from 'types/roles';

import { MenuItemKeys } from '../contants';
import WidgetHeader from '../index';

const TEST_WIDGET_TITLE = 'Test Widget';
const TABLE_WIDGET_TITLE = 'Table Widget';
const WIDGET_HEADER_SEARCH = 'widget-header-search';
const WIDGET_HEADER_SEARCH_INPUT = 'widget-header-search-input';
const TEST_WIDGET_TITLE_RESOLVED = 'Test Widget Title';
const CREATE_ALERTS_TEXT = 'Create Alerts';
const WIDGET_HEADER_OPTIONS_ID = 'widget-header-options';

const mockStore = configureStore([thunk]);
const createMockStore = (): ReturnType<typeof mockStore> =>
	mockStore({
		app: {
			role: 'ADMIN',
			user: {
				userId: 'test-user-id',
				email: 'test@signoz.io',
				name: 'TestUser',
			},
			isLoggedIn: true,
			org: [],
		},
		globalTime: {
			minTime: '2023-01-01T00:00:00Z',
			maxTime: '2023-01-02T00:00:00Z',
		},
	});

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: false,
		},
	},
});

const createMockAppContext = (): Partial<IAppContext> => ({
	user: {
		accessJwt: '',
		refreshJwt: '',
		id: '',
		email: '',
		displayName: '',
		createdAt: 0,
		organization: '',
		orgId: '',
		role: 'ADMIN' as ROLES,
	},
});

const render = (ui: React.ReactElement): ReturnType<typeof rtlRender> =>
	rtlRender(
		<MemoryRouter>
			<QueryClientProvider client={queryClient}>
				<Provider store={createMockStore()}>
					<AppContext.Provider value={createMockAppContext() as IAppContext}>
						{ui}
					</AppContext.Provider>
				</Provider>
			</QueryClientProvider>
		</MemoryRouter>,
	);

jest.mock('hooks/queryBuilder/useCreateAlerts', () => ({
	__esModule: true,
	default: jest.fn(() => jest.fn()),
}));

jest.mock('hooks/dashboard/useGetResolvedText', () => {
	// eslint-disable-next-line sonarjs/no-duplicate-string
	const TEST_WIDGET_TITLE_RESOLVED = 'Test Widget Title';
	return {
		__esModule: true,
		default: jest.fn(() => ({
			truncatedText: TEST_WIDGET_TITLE_RESOLVED,
			fullText: TEST_WIDGET_TITLE_RESOLVED,
		})),
	};
});

jest.mock('lucide-react', () => ({
	CircleX: (): JSX.Element => <svg data-testid="lucide-circle-x" />,
	TriangleAlert: (): JSX.Element => <svg data-testid="lucide-triangle-alert" />,
	X: (): JSX.Element => <svg data-testid="lucide-x" />,
	SquareArrowOutUpRight: (): JSX.Element => (
		<svg data-testid="lucide-square-arrow-out-up-right" />
	),
}));
jest.mock('antd', () => ({
	...jest.requireActual('antd'),
	Spin: (): JSX.Element => <div data-testid="antd-spin" />,
}));

const mockWidget: Widgets = {
	id: 'test-widget-id',
	title: TEST_WIDGET_TITLE,
	description: 'Test Description',
	panelTypes: PANEL_TYPES.TIME_SERIES,
	query: {
		builder: {
			queryData: [],
			queryFormulas: [],
			queryTraceOperator: [],
		},
		promql: [],
		clickhouse_sql: [],
		id: 'query-id',
		queryType: 'builder' as EQueryType,
	},
	timePreferance: 'GLOBAL_TIME',
	opacity: '',
	nullZeroValues: '',
	yAxisUnit: '',
	fillSpans: false,
	softMin: null,
	softMax: null,
	selectedLogFields: [],
	selectedTracesFields: [],
};

const mockQueryResponse = ({
	data: {
		payload: {
			data: {
				result: [],
				resultType: '',
			},
		},
		statusCode: 200,
		message: 'success',
		error: null,
	},
	isLoading: false,
	isError: false,
	error: null,
	isFetching: false,
} as unknown) as UseQueryResult<
	SuccessResponse<MetricRangePayloadProps, unknown> & {
		warning?: Warning;
	},
	Error
>;

describe('WidgetHeader', () => {
	const mockOnView = jest.fn();
	const mockSetSearchTerm = jest.fn();
	const tableProcessedDataRef: MutableRefObject<RowData[]> = {
		current: [
			{
				timestamp: 1234567890,
				key: 'key1',
				col1: 'val1',
				col2: 'val2',
			},
		],
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders widget header with title', () => {
		render(
			<WidgetHeader
				title={TEST_WIDGET_TITLE}
				widget={mockWidget}
				onView={mockOnView}
				queryResponse={mockQueryResponse}
				isWarning={false}
				isFetchingResponse={false}
				tableProcessedDataRef={tableProcessedDataRef}
				setSearchTerm={mockSetSearchTerm}
			/>,
		);

		expect(screen.getByText(TEST_WIDGET_TITLE_RESOLVED)).toBeInTheDocument();
	});

	it('returns null for empty widget', () => {
		const emptyWidget = {
			...mockWidget,
			id: PANEL_TYPES.EMPTY_WIDGET,
		};

		const { container } = render(
			<WidgetHeader
				title="Empty Widget"
				widget={emptyWidget}
				onView={mockOnView}
				queryResponse={mockQueryResponse}
				isWarning={false}
				isFetchingResponse={false}
				tableProcessedDataRef={tableProcessedDataRef}
				setSearchTerm={mockSetSearchTerm}
			/>,
		);

		expect(container.innerHTML).toBe('');
	});

	it('shows search input for table panels', async () => {
		const tableWidget = {
			...mockWidget,
			panelTypes: PANEL_TYPES.TABLE,
		};

		render(
			<WidgetHeader
				title={TABLE_WIDGET_TITLE}
				widget={tableWidget}
				onView={mockOnView}
				queryResponse={mockQueryResponse}
				isWarning={false}
				isFetchingResponse={false}
				tableProcessedDataRef={tableProcessedDataRef}
				setSearchTerm={mockSetSearchTerm}
			/>,
		);

		const searchIcon = screen.getByTestId(WIDGET_HEADER_SEARCH);
		expect(searchIcon).toBeInTheDocument();

		await userEvent.click(searchIcon);

		expect(screen.getByTestId(WIDGET_HEADER_SEARCH_INPUT)).toBeInTheDocument();
	});

	it('handles search input changes and closing', async () => {
		const tableWidget = {
			...mockWidget,
			panelTypes: PANEL_TYPES.TABLE,
		};

		render(
			<WidgetHeader
				title={TABLE_WIDGET_TITLE}
				widget={tableWidget}
				onView={mockOnView}
				queryResponse={mockQueryResponse}
				isWarning={false}
				isFetchingResponse={false}
				tableProcessedDataRef={tableProcessedDataRef}
				setSearchTerm={mockSetSearchTerm}
			/>,
		);

		const searchIcon = screen.getByTestId(`${WIDGET_HEADER_SEARCH}`);
		await userEvent.click(searchIcon);

		const searchInput = screen.getByTestId(WIDGET_HEADER_SEARCH_INPUT);
		await userEvent.type(searchInput, 'test search');
		expect(mockSetSearchTerm).toHaveBeenCalledWith('test search');

		const closeButton = screen
			.getByTestId(WIDGET_HEADER_SEARCH_INPUT)
			.parentElement?.querySelector('.search-header-icons');
		if (closeButton) {
			await userEvent.click(closeButton);
			expect(mockSetSearchTerm).toHaveBeenCalledWith('');
		}
	});

	it('shows error icon when query has error', () => {
		const errorResponse = {
			...mockQueryResponse,
			isError: true as const,
			error: { message: 'Test error' } as Error,
			data: undefined,
		} as UseQueryResult<
			SuccessResponse<MetricRangePayloadProps, unknown> & {
				warning?: Warning;
			},
			Error
		>;

		render(
			<WidgetHeader
				title={TEST_WIDGET_TITLE}
				widget={mockWidget}
				onView={mockOnView}
				queryResponse={errorResponse}
				isWarning={false}
				isFetchingResponse={false}
				tableProcessedDataRef={tableProcessedDataRef}
				setSearchTerm={mockSetSearchTerm}
			/>,
		);

		// check if CircleX icon is rendered
		const circleXIcon = screen.getByTestId('lucide-circle-x');
		expect(circleXIcon).toBeInTheDocument();
	});

	it('shows warning icon when query has warning', () => {
		const warningData = mockQueryResponse.data
			? {
					...mockQueryResponse.data,
					warning: {
						code: 'WARNING_CODE',
						message: 'Test warning',
						url: 'https://example.com',
						warnings: [{ message: 'Test warning' }],
					} as Warning,
			  }
			: undefined;

		const warningResponse = {
			...mockQueryResponse,
			data: warningData,
		} as UseQueryResult<
			SuccessResponse<MetricRangePayloadProps, unknown> & {
				warning?: Warning;
			},
			Error
		>;

		render(
			<WidgetHeader
				title={TEST_WIDGET_TITLE}
				widget={mockWidget}
				onView={mockOnView}
				queryResponse={warningResponse}
				isWarning
				isFetchingResponse={false}
				tableProcessedDataRef={tableProcessedDataRef}
				setSearchTerm={mockSetSearchTerm}
			/>,
		);

		const triangleAlertIcon = screen.getByTestId('lucide-triangle-alert');
		expect(triangleAlertIcon).toBeInTheDocument();
	});

	it('shows spinner when fetching response', () => {
		const fetchingResponse = {
			...mockQueryResponse,
			isFetching: true,
			isLoading: true,
		} as UseQueryResult<
			SuccessResponse<MetricRangePayloadProps, unknown> & {
				warning?: Warning;
			},
			Error
		>;

		render(
			<WidgetHeader
				title={TEST_WIDGET_TITLE}
				widget={mockWidget}
				onView={mockOnView}
				queryResponse={fetchingResponse}
				isWarning={false}
				isFetchingResponse
				tableProcessedDataRef={tableProcessedDataRef}
				setSearchTerm={mockSetSearchTerm}
			/>,
		);

		const antSpin = screen.getByTestId('antd-spin');
		expect(antSpin).toBeInTheDocument();
	});

	it('renders menu options icon', () => {
		render(
			<WidgetHeader
				title={TEST_WIDGET_TITLE}
				widget={mockWidget}
				onView={mockOnView}
				queryResponse={mockQueryResponse}
				isWarning={false}
				isFetchingResponse={false}
				tableProcessedDataRef={tableProcessedDataRef}
				setSearchTerm={mockSetSearchTerm}
				headerMenuList={[MenuItemKeys.View]}
			/>,
		);

		const moreOptionsIcon = screen.getByTestId(WIDGET_HEADER_OPTIONS_ID);
		expect(moreOptionsIcon).toBeInTheDocument();
	});

	it('shows search icon for table panels', () => {
		const tableWidget = {
			...mockWidget,
			panelTypes: PANEL_TYPES.TABLE,
		};

		render(
			<WidgetHeader
				title={TABLE_WIDGET_TITLE}
				widget={tableWidget}
				onView={mockOnView}
				queryResponse={mockQueryResponse}
				isWarning={false}
				isFetchingResponse={false}
				tableProcessedDataRef={tableProcessedDataRef}
				setSearchTerm={mockSetSearchTerm}
			/>,
		);

		const searchIcon = screen.getByTestId(WIDGET_HEADER_SEARCH);
		expect(searchIcon).toBeInTheDocument();
	});

	it('does not show search icon for non-table panels', () => {
		render(
			<WidgetHeader
				title={TEST_WIDGET_TITLE}
				widget={mockWidget}
				onView={mockOnView}
				queryResponse={mockQueryResponse}
				isWarning={false}
				isFetchingResponse={false}
				tableProcessedDataRef={tableProcessedDataRef}
				setSearchTerm={mockSetSearchTerm}
			/>,
		);

		const searchIcon = screen.queryByTestId(WIDGET_HEADER_SEARCH);
		expect(searchIcon).not.toBeInTheDocument();
	});

	it('renders threshold when provided', () => {
		const threshold = <div data-testid="threshold">Threshold Component</div>;

		render(
			<WidgetHeader
				title={TEST_WIDGET_TITLE}
				widget={mockWidget}
				onView={mockOnView}
				queryResponse={mockQueryResponse}
				isWarning={false}
				isFetchingResponse={false}
				tableProcessedDataRef={tableProcessedDataRef}
				setSearchTerm={mockSetSearchTerm}
				threshold={threshold}
			/>,
		);

		expect(screen.getByTestId('threshold')).toBeInTheDocument();
	});

	describe('Create Alerts Menu Item', () => {
		it('renders Create Alerts menu item with external link icon when included in headerMenuList', async () => {
			render(
				<WidgetHeader
					title={TEST_WIDGET_TITLE}
					widget={mockWidget}
					onView={mockOnView}
					queryResponse={mockQueryResponse}
					isWarning={false}
					isFetchingResponse={false}
					tableProcessedDataRef={tableProcessedDataRef}
					setSearchTerm={mockSetSearchTerm}
					headerMenuList={[MenuItemKeys.CreateAlerts]}
				/>,
			);

			const moreOptionsIcon = await screen.findByTestId(WIDGET_HEADER_OPTIONS_ID);
			expect(moreOptionsIcon).toBeInTheDocument();
			await userEvent.hover(moreOptionsIcon);

			await screen.findByText(CREATE_ALERTS_TEXT);

			const externalLinkIcon = await screen.findByTestId(
				'lucide-square-arrow-out-up-right',
			);
			expect(externalLinkIcon).toBeInTheDocument();
		});

		it('Create Alerts menu item is enabled and clickable', async () => {
			const mockCreateAlertsHandler = jest.fn();
			const useCreateAlerts = jest.requireMock(
				'hooks/queryBuilder/useCreateAlerts',
			).default;
			useCreateAlerts.mockReturnValue(mockCreateAlertsHandler);

			render(
				<WidgetHeader
					title={TEST_WIDGET_TITLE}
					widget={mockWidget}
					onView={mockOnView}
					queryResponse={mockQueryResponse}
					isWarning={false}
					isFetchingResponse={false}
					tableProcessedDataRef={tableProcessedDataRef}
					setSearchTerm={mockSetSearchTerm}
					headerMenuList={[MenuItemKeys.CreateAlerts]}
				/>,
			);

			expect(useCreateAlerts).toHaveBeenCalledWith(mockWidget, 'dashboardView');

			const moreOptionsIcon = await screen.findByTestId(WIDGET_HEADER_OPTIONS_ID);
			await userEvent.hover(moreOptionsIcon);

			const createAlertsMenuItem = await screen.findByText(CREATE_ALERTS_TEXT);

			// Verify the menu item is clickable by actually clicking it
			await userEvent.click(createAlertsMenuItem);
			expect(mockCreateAlertsHandler).toHaveBeenCalledTimes(1);
		});
	});
});
