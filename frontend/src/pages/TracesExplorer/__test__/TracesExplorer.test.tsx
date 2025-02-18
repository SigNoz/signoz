/* eslint-disable sonarjs/no-duplicate-string */
import userEvent from '@testing-library/user-event';
import {
	initialQueriesMap,
	initialQueryBuilderFormValues,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import * as compositeQueryHook from 'hooks/queryBuilder/useGetCompositeQueryParam';
import {
	queryRangeForListView,
	queryRangeForTableView,
	queryRangeForTimeSeries,
	queryRangeForTraceView,
} from 'mocks-server/__mockdata__/query_range';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { QueryBuilderContext } from 'providers/QueryBuilder';
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from 'tests/test-utils';

import TracesExplorer from '..';
import { Filter } from '../Filter/Filter';
import { AllTraceFilterKeyValue } from '../Filter/filterUtils';
import {
	checkForSectionContent,
	checkIfSectionIsNotOpen,
	checkIfSectionIsOpen,
	compositeQuery,
	defaultClosedSections,
	defaultOpenSections,
	optionMenuReturn,
	qbProviderValue,
	redirectWithQueryBuilderData,
} from './testUtils';

const historyPush = jest.fn();

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}${ROUTES.TRACES_EXPLORER}/`,
	}),
	useHistory: (): any => ({
		...jest.requireActual('react-router-dom').useHistory(),
		push: historyPush,
	}),
}));

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};

	const uplotMock = jest.fn(() => ({
		paths,
	}));

	return {
		paths,
		default: uplotMock,
	};
});

jest.mock(
	'components/Uplot/Uplot',
	() =>
		function MockUplot(): JSX.Element {
			return <div>MockUplot</div>;
		},
);

window.ResizeObserver =
	window.ResizeObserver ||
	jest.fn().mockImplementation(() => ({
		disconnect: jest.fn(),
		observe: jest.fn(),
		unobserve: jest.fn(),
	}));

const successNotification = jest.fn();
jest.mock('hooks/useNotifications', () => ({
	__esModule: true,
	useNotifications: jest.fn(() => ({
		notifications: {
			success: successNotification,
			error: jest.fn(),
		},
	})),
}));

jest.mock(
	'container/TopNav/DateTimeSelectionV2/index.tsx',
	() =>
		function MockDateTimeSelection(): JSX.Element {
			return <div>MockDateTimeSelection</div>;
		},
);

jest.mock('container/OptionsMenu/useOptionsMenu', () => ({
	__esModule: true,
	default: (): any => optionMenuReturn,
}));

jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useSelector: (): any => ({
		loading: false,
	}),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

describe('TracesExplorer - Filters', () => {
	// Initial filter panel rendering
	// Test the initial state like which filters section are opened, default state of duration slider, etc.
	it('should render the Trace filter', async () => {
		const { getByText, getByTestId } = render(<Filter setOpen={jest.fn()} />);

		Object.values(AllTraceFilterKeyValue).forEach((filter) => {
			expect(getByText(filter)).toBeInTheDocument();
		});

		// Check default state of duration slider
		const minDuration = getByTestId('min-input') as HTMLInputElement;
		const maxDuration = getByTestId('max-input') as HTMLInputElement;
		expect(minDuration).toHaveValue(null);
		expect(minDuration).toHaveProperty('placeholder', '0');
		expect(maxDuration).toHaveValue(null);
		expect(maxDuration).toHaveProperty('placeholder', '100000000');

		// Check which all filter section are opened by default
		defaultOpenSections.forEach((section) =>
			checkIfSectionIsOpen(getByTestId, section),
		);

		// Check which all filter section are closed by default
		defaultClosedSections.forEach((section) =>
			checkIfSectionIsNotOpen(getByTestId, section),
		);

		// check for the status section content
		await checkForSectionContent(['Ok', 'Error']);

		// check for the service name section content from API response
		await checkForSectionContent([
			'customer',
			'demo-app',
			'driver',
			'frontend',
			'mysql',
			'redis',
			'route',
			'go-grpc-otel-server',
			'test',
		]);
	});

	// test the filter panel actions like opening and closing the sections, etc.
	it('filter panel actions', async () => {
		const { getByTestId } = render(<Filter setOpen={jest.fn()} />);

		// Check if the section is closed
		checkIfSectionIsNotOpen(getByTestId, 'name');
		// Open the section
		const name = getByTestId('collapse-name');
		expect(name).toBeInTheDocument();

		userEvent.click(within(name).getByText(AllTraceFilterKeyValue.name));
		await waitFor(() => checkIfSectionIsOpen(getByTestId, 'name'));

		await checkForSectionContent([
			'HTTP GET',
			'HTTP GET /customer',
			'HTTP GET /dispatch',
			'HTTP GET /route',
		]);

		// Close the section
		userEvent.click(within(name).getByText(AllTraceFilterKeyValue.name));
		await waitFor(() => checkIfSectionIsNotOpen(getByTestId, 'name'));
	});

	it('checking filters should update the query', async () => {
		const { getByText } = render(
			<QueryBuilderContext.Provider
				value={
					{
						currentQuery: {
							...initialQueriesMap.traces,
							builder: {
								...initialQueriesMap.traces.builder,
								queryData: [initialQueryBuilderFormValues],
							},
						},
						redirectWithQueryBuilderData,
					} as any
				}
			>
				<Filter setOpen={jest.fn()} />
			</QueryBuilderContext.Provider>,
		);

		const okCheckbox = getByText('Ok');
		fireEvent.click(okCheckbox);
		expect(
			redirectWithQueryBuilderData.mock.calls[
				redirectWithQueryBuilderData.mock.calls.length - 1
			][0].builder.queryData[0].filters.items,
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: {
						id: expect.any(String),
						key: 'hasError',
						type: 'tag',
						dataType: 'bool',
						isColumn: true,
						isJSON: false,
					},
					op: 'in',
					value: ['false'],
				}),
			]),
		);

		// Check if the query is updated when the error checkbox is clicked
		const errorCheckbox = getByText('Error');
		fireEvent.click(errorCheckbox);
		expect(
			redirectWithQueryBuilderData.mock.calls[
				redirectWithQueryBuilderData.mock.calls.length - 1
			][0].builder.queryData[0].filters.items,
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: {
						id: expect.any(String),
						key: 'hasError',
						type: 'tag',
						dataType: 'bool',
						isColumn: true,
						isJSON: false,
					},
					op: 'in',
					value: ['false', 'true'],
				}),
			]),
		);
	});

	it('should render the trace filter with the given query', async () => {
		jest
			.spyOn(compositeQueryHook, 'useGetCompositeQueryParam')
			.mockReturnValue(compositeQuery);

		const { findByText, getByTestId } = render(<Filter setOpen={jest.fn()} />);

		// check if the default query is applied - composite query has filters - serviceName : demo-app and name : HTTP GET /customer
		expect(await findByText('demo-app')).toBeInTheDocument();
		expect(getByTestId('serviceName-demo-app')).toBeChecked();
		expect(await findByText('HTTP GET /customer')).toBeInTheDocument();
		expect(getByTestId('name-HTTP GET /customer')).toBeChecked();
	});

	it('test edge cases of undefined filters', async () => {
		jest.spyOn(compositeQueryHook, 'useGetCompositeQueryParam').mockReturnValue({
			...compositeQuery,
			builder: {
				...compositeQuery.builder,
				queryData: compositeQuery.builder.queryData.map(
					(item) =>
						({
							...item,
							filters: undefined,
						} as any),
				),
			},
		});

		const { getByText } = render(<Filter setOpen={jest.fn()} />);

		Object.values(AllTraceFilterKeyValue).forEach((filter) => {
			expect(getByText(filter)).toBeInTheDocument();
		});
	});

	it('test edge cases of undefined filters - items', async () => {
		jest.spyOn(compositeQueryHook, 'useGetCompositeQueryParam').mockReturnValue({
			...compositeQuery,
			builder: {
				...compositeQuery.builder,
				queryData: compositeQuery.builder.queryData.map(
					(item) =>
						({
							...item,
							filters: {
								...item.filters,
								items: undefined,
							},
						} as any),
				),
			},
		});

		const { getByText } = render(<Filter setOpen={jest.fn()} />);

		Object.values(AllTraceFilterKeyValue).forEach((filter) => {
			expect(getByText(filter)).toBeInTheDocument();
		});
	});

	it('should clear filter on clear & reset button click', async () => {
		const { getByText, getByTestId } = render(
			<QueryBuilderContext.Provider
				value={
					{
						currentQuery: {
							...initialQueriesMap.traces,
							builder: {
								...initialQueriesMap.traces.builder,
								queryData: [initialQueryBuilderFormValues],
							},
						},
						redirectWithQueryBuilderData,
					} as any
				}
			>
				<Filter setOpen={jest.fn()} />
			</QueryBuilderContext.Provider>,
		);

		// check for the status section content
		await checkForSectionContent(['Ok', 'Error']);

		// check for the service name section content from API response
		await checkForSectionContent([
			'customer',
			'demo-app',
			'driver',
			'frontend',
			'mysql',
			'redis',
			'route',
			'go-grpc-otel-server',
			'test',
		]);

		const okCheckbox = getByText('Ok');
		fireEvent.click(okCheckbox);

		const frontendCheckbox = getByText('frontend');
		fireEvent.click(frontendCheckbox);

		// check if checked and present in query
		expect(
			redirectWithQueryBuilderData.mock.calls[
				redirectWithQueryBuilderData.mock.calls.length - 1
			][0].builder.queryData[0].filters.items,
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: {
						id: expect.any(String),
						key: 'hasError',
						type: 'tag',
						dataType: 'bool',
						isColumn: true,
						isJSON: false,
					},
					op: 'in',
					value: ['false'],
				}),
				expect.objectContaining({
					key: {
						key: 'serviceName',
						dataType: 'string',
						type: 'tag',
						isColumn: true,
						isJSON: false,
						id: expect.any(String),
					},
					op: 'in',
					value: ['frontend'],
				}),
			]),
		);

		const clearButton = getByTestId('collapse-serviceName-clearBtn');
		expect(clearButton).toBeInTheDocument();
		fireEvent.click(clearButton);

		// check if cleared and not present in query
		expect(
			redirectWithQueryBuilderData.mock.calls[
				redirectWithQueryBuilderData.mock.calls.length - 1
			][0].builder.queryData[0].filters.items,
		).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: {
						key: 'serviceName',
						dataType: 'string',
						type: 'tag',
						isColumn: true,
						isJSON: false,
						id: expect.any(String),
					},
					op: 'in',
					value: ['frontend'],
				}),
			]),
		);

		// check if reset button is present
		const resetButton = getByTestId('reset-filters');
		expect(resetButton).toBeInTheDocument();
		fireEvent.click(resetButton);

		// check if reset id done
		expect(
			redirectWithQueryBuilderData.mock.calls[
				redirectWithQueryBuilderData.mock.calls.length - 1
			][0].builder.queryData[0].filters.items,
		).toEqual([]);
	});

	it('filter panel should collapse & uncollapsed', async () => {
		const { getByText, getByTestId } = render(<TracesExplorer />);

		Object.values(AllTraceFilterKeyValue).forEach((filter) => {
			expect(getByText(filter)).toBeInTheDocument();
		});

		// Filter panel should collapse
		const collapseButton = getByTestId('toggle-filter-panel');
		expect(collapseButton).toBeInTheDocument();
		fireEvent.click(collapseButton);

		// uncollapse btn should be present
		expect(
			await screen.findByTestId('filter-uncollapse-btn'),
		).toBeInTheDocument();
	});
});

const handleExplorerTabChangeTest = jest.fn();
jest.mock('hooks/useHandleExplorerTabChange', () => ({
	useHandleExplorerTabChange: jest.fn(() => ({
		handleExplorerTabChange: handleExplorerTabChangeTest,
	})),
}));

describe('TracesExplorer - ', () => {
	it('should render the traces explorer page', async () => {
		server.use(
			rest.post('http://localhost/api/v3/query_range', (req, res, ctx) =>
				res(ctx.status(200), ctx.json(queryRangeForTimeSeries)),
			),
		);
		const { findByText, getByText } = render(<TracesExplorer />);

		// assert mocked date time selection
		expect(await findByText('MockDateTimeSelection')).toBeInTheDocument();

		// assert stage&Btn
		expect(getByText('Stage & Run Query')).toBeInTheDocument();

		// assert QB - will not write tests for QB as that would be covererd in QB tests separately
		expect(
			getByText(
				'Search Filter : select options from suggested values, for IN/NOT IN operators - press "Enter" after selecting options',
			),
		).toBeInTheDocument();
		expect(getByText('AGGREGATION INTERVAL')).toBeInTheDocument();
		// why is this present here??
		// expect(getByText('Metrics name')).toBeInTheDocument();
		// expect(getByText('WHERE')).toBeInTheDocument();
		// expect(getByText('Legend Format')).toBeInTheDocument();

		// assert timeseries chart mock
		// expect(await screen.findByText('MockUplot')).toBeInTheDocument();
	});

	it('check tab navigation', async () => {
		const { getByTestId, getByText } = render(<TracesExplorer />);

		// switch to Table view
		const TableBtn = getByText('Table View');
		expect(TableBtn).toBeInTheDocument();
		fireEvent.click(TableBtn);

		expect(handleExplorerTabChangeTest).toBeCalledWith(PANEL_TYPES.TABLE);

		// switch to traces view
		const tracesBtn = getByTestId('Traces');
		expect(tracesBtn).toBeInTheDocument();
		fireEvent.click(tracesBtn);

		expect(handleExplorerTabChangeTest).toBeCalledWith(PANEL_TYPES.TRACE);
	});

	it('trace explorer - list view', async () => {
		server.use(
			rest.post('http://localhost/api/v3/query_range', (req, res, ctx) =>
				res(ctx.status(200), ctx.json(queryRangeForListView)),
			),
		);

		const { getByText } = render(
			<QueryBuilderContext.Provider value={{ ...qbProviderValue }}>
				<TracesExplorer />
			</QueryBuilderContext.Provider>,
		);

		expect(await screen.findByText('Timestamp')).toBeInTheDocument();
		expect(getByText('options_menu.options')).toBeInTheDocument();

		// test if pagination is there
		expect(getByText('Previous')).toBeInTheDocument();
		expect(getByText('Next')).toBeInTheDocument();

		// column interaction is covered in E2E tests as its a complex interaction
	});

	it('trace explorer - table view', async () => {
		server.use(
			rest.post('http://localhost/api/v3/query_range', (req, res, ctx) =>
				res(ctx.status(200), ctx.json(queryRangeForTableView)),
			),
		);
		render(
			<QueryBuilderContext.Provider
				value={{ ...qbProviderValue, panelType: PANEL_TYPES.TABLE }}
			>
				<TracesExplorer />
			</QueryBuilderContext.Provider>,
		);

		expect(await screen.findByText('count')).toBeInTheDocument();
		expect(screen.getByText('87798.00')).toBeInTheDocument();
	});

	it('trace explorer - trace view', async () => {
		server.use(
			rest.post('http://localhost/api/v3/query_range', (req, res, ctx) =>
				res(ctx.status(200), ctx.json(queryRangeForTraceView)),
			),
		);
		const { getByText, getAllByText } = render(
			<QueryBuilderContext.Provider
				value={{ ...qbProviderValue, panelType: PANEL_TYPES.TRACE }}
			>
				<TracesExplorer />
			</QueryBuilderContext.Provider>,
		);

		expect(await screen.findByText('Root Service Name')).toBeInTheDocument();

		// assert table headers
		expect(getByText('Root Operation Name')).toBeInTheDocument();
		expect(getByText('Root Duration (in ms)')).toBeInTheDocument();
		expect(getByText('TraceID')).toBeInTheDocument();
		expect(getByText('No of Spans')).toBeInTheDocument();

		// assert row values
		['demo-app', 'home', '8'].forEach((val) =>
			expect(getAllByText(val)[0]).toBeInTheDocument(),
		);
		expect(getByText('7245.23ms')).toBeInTheDocument();

		// assert traceId and redirection to trace details
		const traceId = getByText('5765b60ba7cc4ddafe8bdaa9c1b4b246');
		fireEvent.click(traceId);

		// assert redirection - should go to /trace/:traceId
		expect(window.location.href).toEqual(
			'http://localhost/trace/5765b60ba7cc4ddafe8bdaa9c1b4b246',
		);
	});

	it('test for explorer options', async () => {
		const { getByText, getByTestId } = render(<TracesExplorer />);

		// assert explorer options - action btns
		[
			'Save this view',
			'Create an Alert',
			'Add to Dashboard',
			'Select a view',
		].forEach((val) => expect(getByText(val)).toBeInTheDocument());

		const hideExplorerOption = getByTestId('hide-toolbar');
		expect(hideExplorerOption).toBeInTheDocument();
		fireEvent.click(hideExplorerOption);

		// explorer options should hide and show btn should be present
		expect(await screen.findByTestId('show-explorer-option')).toBeInTheDocument();
		expect(screen.queryByTestId('hide-toolbar')).toBeNull();

		// show explorer options
		const showExplorerOption = screen.getByTestId('show-explorer-option');
		expect(showExplorerOption).toBeInTheDocument();
		fireEvent.click(showExplorerOption);

		// explorer options should show and hide btn should be present
		expect(await screen.findByTestId('hide-toolbar')).toBeInTheDocument();
	});

	it('select a view options - assert and save this view', async () => {
		const { container } = render(<TracesExplorer />);

		await act(async () => {
			fireEvent.mouseDown(
				container.querySelector(
					'.view-options .ant-select-selection-search-input',
				) as HTMLElement,
			);
		});

		const viewListOptions = await screen.findByRole('listbox');
		expect(viewListOptions).toBeInTheDocument();

		expect(within(viewListOptions).getByText('R-test panel')).toBeInTheDocument();

		expect(within(viewListOptions).getByText('Table View')).toBeInTheDocument();

		// save this view
		fireEvent.click(screen.getByText('Save this view'));

		const saveViewModalInput = await screen.findByPlaceholderText(
			'e.g. External http method view',
		);
		expect(saveViewModalInput).toBeInTheDocument();

		const saveViewModal = document.querySelector(
			'.ant-modal-content',
		) as HTMLElement;
		expect(saveViewModal).toBeInTheDocument();

		await act(async () =>
			fireEvent.change(saveViewModalInput, { target: { value: 'test view' } }),
		);

		expect(saveViewModalInput).toHaveValue('test view');
		await act(async () => {
			fireEvent.click(within(saveViewModal).getByTestId('save-view-btn'));
		});

		expect(successNotification).toHaveBeenCalledWith({
			message: 'View Saved Successfully',
		});
	});

	it('create a dashboard btn assert', async () => {
		const { getByText } = render(<TracesExplorer />);

		const createDashboardBtn = getByText('Add to Dashboard');
		expect(createDashboardBtn).toBeInTheDocument();
		fireEvent.click(createDashboardBtn);

		expect(await screen.findByText('Export Panel')).toBeInTheDocument();
		const createDashboardModal = document.querySelector(
			'.ant-modal-content',
		) as HTMLElement;
		expect(createDashboardModal).toBeInTheDocument();

		// assert modal content
		expect(
			within(createDashboardModal).getByText('Select Dashboard'),
		).toBeInTheDocument();

		expect(
			within(createDashboardModal).getByText('New Dashboard'),
		).toBeInTheDocument();
	});

	it('create an alert btn assert', async () => {
		const { getByText } = render(<TracesExplorer />);

		const createAlertBtn = getByText('Create an Alert');
		expect(createAlertBtn).toBeInTheDocument();
		fireEvent.click(createAlertBtn);

		expect(historyPush).toHaveBeenCalledWith(
			expect.stringContaining(`${ROUTES.ALERTS_NEW}`),
		);
	});
});
