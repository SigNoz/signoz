import { ENVIRONMENT } from 'constants/env';
import ROUTES from 'constants/routes';
import { quickFiltersListResponse } from 'mocks-server/__mockdata__/customQuickFilters';
import {
	queryRangeForListView,
	queryRangeForTableView,
	queryRangeForTableViewV5,
	queryRangeForTraceView,
} from 'mocks-server/__mockdata__/query_range';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from 'tests/test-utils';
import { QueryRangePayloadV5 } from 'types/api/v5/queryRange';

import TracesExplorer from '..';
import { optionMenuReturn, qbProviderValue } from './testUtils';

const currentTestUrl =
	'/traces-explorer/?panelType=list&selectedExplorerView=list';

jest.mock('react-router-dom-v5-compat', () => ({
	...jest.requireActual('react-router-dom-v5-compat'),
	useSearchParams: jest.fn(() => {
		const searchParams = new URLSearchParams();

		// Parse the current test URL
		const url = new URL(currentTestUrl, 'http://localhost');
		const panelType = url.searchParams.get('panelType') || 'list';
		const selectedExplorerView =
			url.searchParams.get('selectedExplorerView') || 'list';

		searchParams.set('panelType', panelType);
		searchParams.set('selectedExplorerView', selectedExplorerView);

		return [searchParams, jest.fn()];
	}),
}));

// Mock useGetPanelTypesQueryParam to return the correct panel type
jest.mock('hooks/queryBuilder/useGetPanelTypesQueryParam', () => ({
	useGetPanelTypesQueryParam: jest.fn(() => {
		const url = new URL(currentTestUrl, 'http://localhost');
		return url.searchParams.get('panelType') || 'list';
	}),
}));

const mockNavigate = jest.fn();

const BASE_URL = ENVIRONMENT.baseURL;
const FILTER_SERVICE_NAME = 'Service Name';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): {
		pathname: string;
		search: string;
		hash: string;
		state: any;
	} => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}${ROUTES.TRACES_EXPLORER}/`,
		search: '',
		hash: '',
		state: null,
	}),
}));

jest.mock('lib/router/navigation', () => ({
	...jest.requireActual('lib/router/navigation'),
	navigate: (...args: unknown[]): void => mockNavigate(...args),
}));

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

const renderWithTracesExplorerRouter = (
	component: React.ReactElement,
	initialEntries: string[] = [
		'/traces-explorer/?panelType=list&selectedExplorerView=list',
	],
): ReturnType<typeof render> =>
	render(
		component,
		{},
		{
			initialRoute: initialEntries[0],
			queryBuilderOverrides: qbProviderValue,
		},
	);

const handleExplorerTabChangeTest = jest.fn();
jest.mock('hooks/useHandleExplorerTabChange', () => ({
	useHandleExplorerTabChange: jest.fn(() => ({
		handleExplorerTabChange: handleExplorerTabChangeTest,
	})),
}));

let capturedPayload: QueryRangePayloadV5;

describe('TracesExplorer -', () => {
	const quickFiltersListURL = `${BASE_URL}/api/v2/quick_filters/traces`;

	const setupServer = (): void => {
		server.use(
			rest.get(quickFiltersListURL, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(quickFiltersListResponse)),
			),
		);
		server.use(
			rest.post(`${BASE_URL}/api/v5/query_range`, (req, res, ctx) =>
				res(ctx.status(200), ctx.json(queryRangeForTableView)),
			),
		);
	};

	beforeEach(() => {
		setupServer();
	});

	afterEach(() => {
		server.resetHandlers();
	});

	afterAll(() => {
		server.close();
		cleanup();
	});

	it.skip('trace explorer - list view', async () => {
		server.use(
			rest.post(`${BASE_URL}/api/v5/query_range`, (req, res, ctx) =>
				res(ctx.status(200), ctx.json(queryRangeForListView)),
			),
		);

		const { getByText } = renderWithTracesExplorerRouter(<TracesExplorer />);

		await screen.findByText(FILTER_SERVICE_NAME);

		await screen.findByText('demo-app');
		expect(getByText('options_menu.options')).toBeInTheDocument();

		// test if pagination is there
		expect(getByText('Previous')).toBeInTheDocument();
		expect(getByText('Next')).toBeInTheDocument();

		// column interaction is covered in E2E tests as its a complex interaction
	});

	it('should not add id to orderBy when dataSource is traces', async () => {
		server.use(
			rest.post(`${BASE_URL}/api/v5/query_range`, async (req, res, ctx) => {
				const payload = await req.json();
				capturedPayload = payload;
				return res(ctx.status(200), ctx.json(queryRangeForTableView));
			}),
		);

		renderWithTracesExplorerRouter(<TracesExplorer />, [
			'/traces-explorer/?panelType=list&selectedExplorerView=list',
		]);

		await waitFor(() => {
			expect(capturedPayload).toBeDefined();
		});

		expect(
			(capturedPayload.compositeQuery.queries[0].spec as any).order,
		).toStrictEqual([{ key: { name: 'timestamp' }, direction: 'desc' }]);
	});

	it.skip('trace explorer - table view', async () => {
		server.use(
			rest.post(`${BASE_URL}/api/v5/query_range`, (req, res, ctx) =>
				res(ctx.status(200), ctx.json(queryRangeForTableViewV5)),
			),
		);

		renderWithTracesExplorerRouter(<TracesExplorer />, [
			'/traces-explorer/?panelType=table&selectedExplorerView=table',
		]);

		// Wait for the data to load and check for actual table data
		await screen.findByText('401310');
		expect(screen.getByText('401310')).toBeInTheDocument();
	});

	// skipping since we dont have trace view with new query builder for the time being

	it.skip('trace explorer - trace view', async () => {
		server.use(
			rest.post(`${BASE_URL}/api/v5/query_range`, (req, res, ctx) =>
				res(ctx.status(200), ctx.json(queryRangeForTraceView)),
			),
		);

		const { getByText, getAllByText } = renderWithTracesExplorerRouter(
			<TracesExplorer />,
			['/traces-explorer/?panelType=trace&selectedExplorerView=trace'],
		);

		await expect(
			screen.findByText('Root Service Name'),
		).resolves.toBeInTheDocument();

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
		expect(window.location.href).toBe(
			'http://localhost/trace/5765b60ba7cc4ddafe8bdaa9c1b4b246',
		);
	});

	it('trace explorer - trace view should only send order by timestamp in the query', async () => {
		let capturedPayload: QueryRangePayloadV5;
		const orderBy = [
			{ columnName: 'id', order: 'desc' },
			{ columnName: 'serviceName', order: 'desc' },
		];
		const defaultOrderBy = [
			{
				key: { name: 'timestamp' },
				direction: 'desc',
			},
		];
		server.use(
			rest.post(`${BASE_URL}/api/v5/query_range`, async (req, res, ctx) => {
				const payload = await req.json();
				capturedPayload = payload;
				return res(ctx.status(200), ctx.json(queryRangeForTraceView));
			}),
		);

		renderWithTracesExplorerRouter(<TracesExplorer />, [
			'/traces-explorer/?panelType=trace&selectedExplorerView=trace',
		]);

		await waitFor(() => {
			expect(capturedPayload).toBeDefined();
			expect(
				(capturedPayload?.compositeQuery?.queries[0].spec as any).order,
			).toStrictEqual(defaultOrderBy);
			expect(
				(capturedPayload?.compositeQuery?.queries[0].spec as any).order,
			).not.toStrictEqual(orderBy);
		});
	});

	it('test for explorer options', async () => {
		const { getByText, getByTestId } = renderWithTracesExplorerRouter(
			<TracesExplorer />,
			['/traces-explorer/?panelType=list&selectedExplorerView=list'],
		);

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
		await expect(
			screen.findByTestId('show-explorer-option'),
		).resolves.toBeInTheDocument();
		expect(screen.queryByTestId('hide-toolbar')).toBeNull();

		// show explorer options
		const showExplorerOption = screen.getByTestId('show-explorer-option');
		expect(showExplorerOption).toBeInTheDocument();
		fireEvent.click(showExplorerOption);

		// explorer options should show and hide btn should be present
		await expect(
			screen.findByTestId('hide-toolbar'),
		).resolves.toBeInTheDocument();
	});

	it('select a view options - assert and save this view', async () => {
		const { container } = renderWithTracesExplorerRouter(<TracesExplorer />, [
			'/traces-explorer/?panelType=list&selectedExplorerView=list',
		]);

		const viewSearchInput = await waitFor(() => {
			const el = container.querySelector(
				'.view-options .ant-select-selection-search-input',
			) as HTMLElement;
			expect(el).toBeInTheDocument();
			return el;
		});

		fireEvent.mouseDown(viewSearchInput);

		// The saved-views request has to land and re-render the dropdown before the
		// option exists; findByRole's 1s default is not enough on a loaded runner.
		await expect(
			screen.findByRole('option', { name: 'R-test panel' }, { timeout: 5000 }),
		).resolves.toBeInTheDocument();

		// save this view
		fireEvent.click(await screen.findByText('Save this view'));

		const saveViewModalInput = await screen.findByPlaceholderText(
			'e.g. External http method view',
		);
		expect(saveViewModalInput).toBeInTheDocument();

		const saveViewModal = await waitFor(() => {
			const el = document.querySelector('.ant-modal-content') as HTMLElement;
			expect(el).toBeInTheDocument();
			return el;
		});

		await act(async () =>
			fireEvent.change(saveViewModalInput, { target: { value: 'test view' } }),
		);

		expect(saveViewModalInput).toHaveValue('test view');
		await act(async () => {
			fireEvent.click(within(saveViewModal).getByTestId('save-view-btn'));
		});

		await waitFor(() => {
			expect(successNotification).toHaveBeenCalledWith({
				message: 'View Saved Successfully',
			});
		});
	}, 15000);

	it('create a dashboard btn assert', async () => {
		renderWithTracesExplorerRouter(<TracesExplorer />, [
			'/traces-explorer/?panelType=list&selectedExplorerView=list',
		]);

		const createDashboardBtn = await screen.findByText('Add to Dashboard');
		expect(createDashboardBtn).toBeInTheDocument();
		fireEvent.click(createDashboardBtn);

		const createDashboardModal = (await screen.findByRole(
			'dialog',
		)) as HTMLElement;
		expect(createDashboardModal).toBeInTheDocument();

		// assert modal content
		expect(
			within(createDashboardModal).getByTestId('export-panel-new-dashboard'),
		).toBeInTheDocument();

		expect(
			within(createDashboardModal).getByTestId('export-panel-export'),
		).toBeInTheDocument();
	});

	it('create an alert btn assert', async () => {
		renderWithTracesExplorerRouter(<TracesExplorer />, [
			'/traces-explorer/?panelType=list&selectedExplorerView=list',
		]);

		const createAlertBtn = await screen.findByText('Create an Alert');
		expect(createAlertBtn).toBeInTheDocument();
		fireEvent.click(createAlertBtn);

		expect(mockNavigate).toHaveBeenCalledWith(
			expect.stringContaining(`${ROUTES.ALERTS_NEW}`),
		);
	});
});
