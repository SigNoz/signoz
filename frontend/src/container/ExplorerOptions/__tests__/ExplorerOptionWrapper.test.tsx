import { PANEL_TYPES } from 'constants/queryBuilder';
import { MOCK_QUERY } from 'container/QueryTable/Drilldown/__tests__/mockTableData';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { generateExportToDashboardLink } from 'utils/dashboard/generateExportToDashboardLink';
import { v4 } from 'uuid';

import ExplorerOptionWrapper from '../ExplorerOptionWrapper';
import { getExplorerToolBarVisibility } from '../utils';

// Mock dependencies
jest.mock('hooks/dashboard/useUpdateDashboard');

jest.mock('../utils', () => ({
	getExplorerToolBarVisibility: jest.fn(),
	generateRGBAFromHex: jest.fn(() => 'rgba(0, 0, 0, 0.08)'),
	getRandomColor: jest.fn(() => '#000000'),
	saveNewViewHandler: jest.fn(),
	setExplorerToolBarVisibility: jest.fn(),
	DATASOURCE_VS_ROUTES: {},
}));

const mockGetExplorerToolBarVisibility = jest.mocked(
	getExplorerToolBarVisibility,
);

const mockUseUpdateDashboard = jest.mocked(useUpdateDashboard);

// Mock data
const TEST_QUERY_ID = 'test-query-id';
const TEST_DASHBOARD_ID = 'test-dashboard-id';
const TEST_DASHBOARD_TITLE = 'Test Dashboard';
const TEST_DASHBOARD_DESCRIPTION = 'Test Description';
const TEST_TIMESTAMP = '2023-01-01T00:00:00Z';
const TEST_DASHBOARD_TITLE_2 = 'Test Dashboard for Export';
const NEW_DASHBOARD_ID = 'new-dashboard-id';
const DASHBOARDS_API_ENDPOINT = '*/api/v1/dashboards';

// Use the existing mock query from the codebase
const mockQuery: Query = {
	...MOCK_QUERY,
	id: TEST_QUERY_ID, // Override with our test ID
} as Query;

const createMockDashboard = (id: string = TEST_DASHBOARD_ID): Dashboard => ({
	id,
	data: {
		title: TEST_DASHBOARD_TITLE,
		description: TEST_DASHBOARD_DESCRIPTION,
		tags: [],
		layout: [],
		variables: {},
	},
	createdAt: TEST_TIMESTAMP,
	updatedAt: TEST_TIMESTAMP,
	createdBy: 'test-user',
	updatedBy: 'test-user',
});

const ADD_TO_DASHBOARD_BUTTON_NAME = /add to dashboard/i;

// Helper function to render component with props
const renderExplorerOptionWrapper = (
	overrides = {},
): ReturnType<typeof render> => {
	const props = {
		disabled: false,
		query: mockQuery,
		isLoading: false,
		onExport: jest.fn() as jest.MockedFunction<
			(
				dashboard: Dashboard | null,
				isNewDashboard?: boolean,
				queryToExport?: Query,
			) => void
		>,
		sourcepage: DataSource.LOGS,
		isOneChartPerQuery: false,
		splitedQueries: [],
		signalSource: 'test-signal',
		...overrides,
	};

	return render(
		<ExplorerOptionWrapper
			disabled={props.disabled}
			query={props.query}
			isLoading={props.isLoading}
			onExport={props.onExport}
			sourcepage={props.sourcepage}
			isOneChartPerQuery={props.isOneChartPerQuery}
			splitedQueries={props.splitedQueries}
			signalSource={props.signalSource}
		/>,
	);
};

describe('ExplorerOptionWrapper', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetExplorerToolBarVisibility.mockReturnValue(true);

		// Mock useUpdateDashboard to return a mutation object
		mockUseUpdateDashboard.mockReturnValue(({
			mutate: jest.fn(),
			mutateAsync: jest.fn(),
			isLoading: false,
			isError: false,
			isSuccess: false,
			data: undefined,
			error: null,
			reset: jest.fn(),
		} as unknown) as ReturnType<typeof useUpdateDashboard>);
	});

	describe('onExport functionality', () => {
		it('should call onExport when New Dashboard button is clicked in export modal', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const testOnExport = jest.fn() as jest.MockedFunction<
				(
					dashboard: Dashboard | null,
					isNewDashboard?: boolean,
					queryToExport?: Query,
				) => void
			>;

			// Mock the dashboard creation API
			const mockNewDashboard = createMockDashboard(NEW_DASHBOARD_ID);
			server.use(
				rest.post(DASHBOARDS_API_ENDPOINT, (_req, res, ctx) =>
					res(ctx.status(200), ctx.json({ data: mockNewDashboard })),
				),
			);

			renderExplorerOptionWrapper({
				onExport: testOnExport,
			});

			// Find and click the "Add to Dashboard" button
			const addToDashboardButton = screen.getByRole('button', {
				name: ADD_TO_DASHBOARD_BUTTON_NAME,
			});
			await user.click(addToDashboardButton);

			// Wait for the export modal to appear
			await waitFor(() => {
				expect(screen.getByRole('dialog')).toBeInTheDocument();
			});

			// Click the "New Dashboard" button
			const newDashboardButton = screen.getByRole('button', {
				name: /new dashboard/i,
			});
			await user.click(newDashboardButton);

			// Wait for the API call to complete and onExport to be called
			await waitFor(() => {
				expect(testOnExport).toHaveBeenCalledWith(mockNewDashboard, true);
			});
		});

		it('should call onExport when selecting existing dashboard and clicking Export button', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const testOnExport = jest.fn() as jest.MockedFunction<
				(
					dashboard: Dashboard | null,
					isNewDashboard?: boolean,
					queryToExport?: Query,
				) => void
			>;

			// Mock existing dashboards with unique titles
			const mockDashboard1 = createMockDashboard('dashboard-1');
			mockDashboard1.data.title = 'Dashboard 1';
			const mockDashboard2 = createMockDashboard('dashboard-2');
			mockDashboard2.data.title = 'Dashboard 2';
			const mockDashboards = [mockDashboard1, mockDashboard2];

			server.use(
				rest.get(DASHBOARDS_API_ENDPOINT, (_req, res, ctx) =>
					res(ctx.status(200), ctx.json({ data: mockDashboards })),
				),
			);

			renderExplorerOptionWrapper({
				onExport: testOnExport,
			});

			// Find and click the "Add to Dashboard" button
			const addToDashboardButton = screen.getByRole('button', {
				name: ADD_TO_DASHBOARD_BUTTON_NAME,
			});
			await user.click(addToDashboardButton);

			// Wait for the export modal to appear
			await waitFor(() => {
				expect(screen.getByRole('dialog')).toBeInTheDocument();
			});

			// Wait for dashboards to load and then click on the dashboard select dropdown
			await waitFor(() => {
				expect(screen.getByText('Select Dashboard')).toBeInTheDocument();
			});

			// Get the modal and find the dashboard select dropdown within it
			const modal = screen.getByRole('dialog');
			const dashboardSelect = modal.querySelector(
				'[role="combobox"]',
			) as HTMLElement;
			expect(dashboardSelect).toBeInTheDocument();
			await user.click(dashboardSelect);

			// Wait for the dropdown options to appear and select the first dashboard
			await waitFor(() => {
				expect(screen.getByText(mockDashboard1.data.title)).toBeInTheDocument();
			});

			// Click on the first dashboard option
			const dashboardOption = screen.getByText(mockDashboard1.data.title);
			await user.click(dashboardOption);

			// Wait for the selection to be made and the Export button to be enabled
			await waitFor(() => {
				const exportButton = screen.getByRole('button', { name: /export/i });
				expect(exportButton).not.toBeDisabled();
			});

			// Click the Export button
			const exportButton = screen.getByRole('button', { name: /export/i });
			await user.click(exportButton);

			// Wait for onExport to be called with the selected dashboard
			await waitFor(() => {
				expect(testOnExport).toHaveBeenCalledWith(mockDashboard1, false);
			});
		});

		it('should test actual handleExport function with generateExportToDashboardLink and verify useUpdateDashboard is NOT called', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			// Mock the safeNavigate function
			const mockSafeNavigate = jest.fn();

			// Get the mock mutate function to track calls
			const mockMutate = mockUseUpdateDashboard().mutate as jest.MockedFunction<
				(...args: unknown[]) => void
			>;

			const panelTypeParam = PANEL_TYPES.TIME_SERIES;
			const widgetId = v4();
			const query = mockQuery;

			// Create a real handleExport function similar to LogsExplorerViews
			// This should NOT call useUpdateDashboard (as per PR #8029)
			const handleExport = (dashboard: Dashboard | null): void => {
				if (!dashboard) return;

				// Call the actual generateExportToDashboardLink function (not mocked)
				const dashboardEditView = generateExportToDashboardLink({
					query,
					panelType: panelTypeParam,
					dashboardId: dashboard.id,
					widgetId,
				});

				// Simulate navigation
				mockSafeNavigate(dashboardEditView);
			};

			// Mock existing dashboards
			const mockDashboard = createMockDashboard('test-dashboard-id');
			mockDashboard.data.title = TEST_DASHBOARD_TITLE_2;

			server.use(
				rest.get(DASHBOARDS_API_ENDPOINT, (_req, res, ctx) =>
					res(ctx.status(200), ctx.json({ data: [mockDashboard] })),
				),
			);

			renderExplorerOptionWrapper({
				onExport: handleExport,
			});

			// Find and click the "Add to Dashboard" button
			const addToDashboardButton = screen.getByRole('button', {
				name: ADD_TO_DASHBOARD_BUTTON_NAME,
			});
			await user.click(addToDashboardButton);

			// Wait for the export modal to appear
			await waitFor(() => {
				expect(screen.getByRole('dialog')).toBeInTheDocument();
			});

			// Wait for dashboards to load and then click on the dashboard select dropdown
			await waitFor(() => {
				expect(screen.getByText('Select Dashboard')).toBeInTheDocument();
			});

			// Get the modal and find the dashboard select dropdown within it
			const modal = screen.getByRole('dialog');
			const dashboardSelect = modal.querySelector(
				'[role="combobox"]',
			) as HTMLElement;
			expect(dashboardSelect).toBeInTheDocument();
			await user.click(dashboardSelect);

			// Wait for the dropdown options to appear and select the dashboard
			await waitFor(() => {
				expect(screen.getByText(mockDashboard.data.title)).toBeInTheDocument();
			});

			// Click on the dashboard option
			const dashboardOption = screen.getByText(mockDashboard.data.title);
			await user.click(dashboardOption);

			// Wait for the selection to be made and the Export button to be enabled
			await waitFor(() => {
				const exportButton = screen.getByRole('button', { name: /export/i });
				expect(exportButton).not.toBeDisabled();
			});

			// Click the Export button
			const exportButton = screen.getByRole('button', { name: /export/i });
			await user.click(exportButton);

			// Wait for the handleExport function to be called and navigation to occur
			await waitFor(() => {
				expect(mockSafeNavigate).toHaveBeenCalledTimes(1);
				expect(mockSafeNavigate).toHaveBeenCalledWith(
					`/dashboard/test-dashboard-id/new?graphType=${panelTypeParam}&widgetId=${widgetId}&compositeQuery=${encodeURIComponent(
						JSON.stringify(query),
					)}`,
				);
			});

			// Assert that useUpdateDashboard was NOT called (as per PR #8029)
			expect(mockMutate).not.toHaveBeenCalled();
		});

		it('should not show export buttons when component is disabled', () => {
			const testOnExport = jest.fn() as jest.MockedFunction<
				(
					dashboard: Dashboard | null,
					isNewDashboard?: boolean,
					queryToExport?: Query,
				) => void
			>;

			renderExplorerOptionWrapper({ disabled: true, onExport: testOnExport });

			// The "Add to Dashboard" button should be disabled
			const addToDashboardButton = screen.getByRole('button', {
				name: ADD_TO_DASHBOARD_BUTTON_NAME,
			});
			expect(addToDashboardButton).toBeDisabled();
		});
	});
});
