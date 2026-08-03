import { useHistory } from 'react-router-dom';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { MOCK_QUERY } from 'container/QueryTable/Drilldown/__tests__/mockTableData';
import { ExportDashboard } from 'hooks/dashboard/useExportDashboards';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { serialize } from 'lib/compositeQuery/serializer';
import { rest, server } from 'mocks-server/server';
import {
	defaultFeatureFlags,
	render,
	screen,
	userEvent,
	waitFor,
} from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { generateExportToDashboardLink } from 'utils/dashboard/generateExportToDashboardLink';
import { v4 } from 'uuid';

import ExplorerOptionWrapper from '../ExplorerOptionWrapper';
import { getExplorerToolBarVisibility } from '../utils';

// Mock dependencies
jest.mock('hooks/dashboard/useUpdateDashboard');

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useHistory: jest.fn(),
}));

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
const mockUseHistory = jest.mocked(useHistory);

// Mock data
const TEST_QUERY_ID = 'test-query-id';
const TEST_DASHBOARD_ID = 'test-dashboard-id';
const TEST_DASHBOARD_TITLE_2 = 'Test Dashboard for Export';
const NEW_DASHBOARD_ID = 'new-dashboard-id';

// The export dialog talks to the generated Perses-spec dashboard endpoints.
const V2_LIST_ENDPOINT = '*/api/v2/users/me/dashboards';
const V2_CREATE_ENDPOINT = '*/api/v2/dashboards';

// "Create new dashboard" names the dashboard from the `new_dashboard_title` i18n
// key; the test-utils react-i18next mock returns the key verbatim.
const NEW_DASHBOARD_TITLE = 'new_dashboard_title';

// Use the existing mock query from the codebase
const mockQuery: Query = {
	...MOCK_QUERY,
	id: TEST_QUERY_ID, // Override with our test ID
} as Query;

const ADD_TO_DASHBOARD_BUTTON_NAME = /add to dashboard/i;

interface PickerDashboard {
	id: string;
	title: string;
}

/** Register the "list dashboards" endpoint the picker reads. */
function mockDashboardList(dashboards: PickerDashboard[]): void {
	server.use(
		rest.get(V2_LIST_ENDPOINT, (_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: {
						dashboards: dashboards.map(({ id, title }) => ({
							id,
							name: title,
							spec: { display: { name: title } },
						})),
						reservedKeywords: [],
					},
				}),
			),
		),
	);
}

/** Register the "create dashboard" endpoint the "New dashboard" button hits. */
function mockCreateDashboard(id: string): void {
	server.use(
		rest.post(V2_CREATE_ENDPOINT, (_req, res, ctx) =>
			res(ctx.status(201), ctx.json({ status: 'success', data: { id } })),
		),
	);
}

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
				dashboard: ExportDashboard | null,
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
		undefined,
		{ appContextOverrides: { featureFlags: defaultFeatureFlags } },
	);
};

describe('ExplorerOptionWrapper', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetExplorerToolBarVisibility.mockReturnValue(true);
		// Mock useUpdateDashboard to return a mutation object
		mockUseUpdateDashboard.mockReturnValue({
			mutate: jest.fn(),
			mutateAsync: jest.fn(),
			isLoading: false,
			isError: false,
			isSuccess: false,
			data: undefined,
			error: null,
			reset: jest.fn(),
		} as unknown as ReturnType<typeof useUpdateDashboard>);
	});

	it('should navigate to alert creation page when "Create an Alert" is clicked in logs-explorer', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const mockPush = jest.fn();
		mockUseHistory.mockReturnValue({
			push: mockPush,
		} as unknown as ReturnType<typeof useHistory>);

		renderExplorerOptionWrapper({ sourcepage: DataSource.LOGS });

		const createAlertButton = screen.getByRole('button', {
			name: 'Create an Alert',
		});
		await user.click(createAlertButton);

		expect(mockPush).toHaveBeenCalledTimes(1);
		const calledWith = mockPush.mock.calls[0][0] as string;
		const [path, search = ''] = calledWith.split('?');
		expect(path).toBe('/alerts/new');
		const params = new URLSearchParams(search);
		expect(params.has('compositeQuery')).toBe(true);
	});

	describe('onExport functionality', () => {
		it('should call onExport when New Dashboard button is clicked in export modal', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const testOnExport = jest.fn() as jest.MockedFunction<
				(
					dashboard: ExportDashboard | null,
					isNewDashboard?: boolean,
					queryToExport?: Query,
				) => void
			>;

			mockCreateDashboard(NEW_DASHBOARD_ID);

			renderExplorerOptionWrapper({ onExport: testOnExport });

			// Find and click the "Add to Dashboard" button
			const addToDashboardButton = screen.getByRole('button', {
				name: ADD_TO_DASHBOARD_BUTTON_NAME,
			});
			await user.click(addToDashboardButton);

			// Wait for the export modal to appear
			await waitFor(() => {
				expect(screen.getByRole('dialog')).toBeInTheDocument();
			});

			// Click the "New dashboard" button
			const newDashboardButton = screen.getByTestId('export-panel-new-dashboard');
			await user.click(newDashboardButton);

			// Wait for the API call to complete and onExport to be called
			await waitFor(() => {
				expect(testOnExport).toHaveBeenCalledWith(
					{ id: NEW_DASHBOARD_ID, title: NEW_DASHBOARD_TITLE },
					true,
				);
			});
		});

		it('should call onExport when selecting existing dashboard and clicking Export button', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const testOnExport = jest.fn() as jest.MockedFunction<
				(
					dashboard: ExportDashboard | null,
					isNewDashboard?: boolean,
					queryToExport?: Query,
				) => void
			>;

			// Mock existing dashboards with unique titles
			const dashboards: PickerDashboard[] = [
				{ id: 'dashboard-1', title: 'Dashboard 1' },
				{ id: 'dashboard-2', title: 'Dashboard 2' },
			];
			mockDashboardList(dashboards);

			renderExplorerOptionWrapper({ onExport: testOnExport });

			// Find and click the "Add to Dashboard" button
			const addToDashboardButton = screen.getByRole('button', {
				name: ADD_TO_DASHBOARD_BUTTON_NAME,
			});
			await user.click(addToDashboardButton);

			// Wait for the export modal to appear
			await waitFor(() => {
				expect(screen.getByRole('dialog')).toBeInTheDocument();
			});

			// Wait for the dashboard select to render AND finish loading. antd
			// disables the Select while the list request is in flight, and a click
			// on a disabled combobox is a no-op — so sync on the ready (enabled)
			// state before clicking.
			const modal = screen.getByRole('dialog');
			await waitFor(() => {
				const combobox = modal.querySelector('[role="combobox"]');
				expect(combobox).toBeTruthy();
				expect(combobox).not.toBeDisabled();
			});

			const dashboardSelect = modal.querySelector(
				'[role="combobox"]',
			) as HTMLElement;
			expect(dashboardSelect).toBeInTheDocument();
			await user.click(dashboardSelect);

			// Wait for the dropdown options to appear and select the first dashboard
			await waitFor(() => {
				expect(screen.getByText(dashboards[0].title)).toBeInTheDocument();
			});

			// Click on the first dashboard option
			const dashboardOption = screen.getByText(dashboards[0].title);
			await user.click(dashboardOption);

			// Wait for the selection to be made and the export button to be enabled
			await waitFor(() => {
				expect(screen.getByTestId('export-panel-export')).not.toBeDisabled();
			});

			// Click the export button
			const exportButton = screen.getByTestId('export-panel-export');
			await user.click(exportButton);

			// Wait for onExport to be called with the selected dashboard
			await waitFor(() => {
				expect(testOnExport).toHaveBeenCalledWith(
					{ id: dashboards[0].id, title: dashboards[0].title },
					false,
				);
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
			const handleExport = (dashboard: ExportDashboard | null): void => {
				if (!dashboard) {
					return;
				}

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
			const dashboards: PickerDashboard[] = [
				{ id: TEST_DASHBOARD_ID, title: TEST_DASHBOARD_TITLE_2 },
			];
			mockDashboardList(dashboards);

			renderExplorerOptionWrapper({ onExport: handleExport });

			// Find and click the "Add to Dashboard" button
			const addToDashboardButton = screen.getByRole('button', {
				name: ADD_TO_DASHBOARD_BUTTON_NAME,
			});
			await user.click(addToDashboardButton);

			// Wait for the export modal to appear
			await waitFor(() => {
				expect(screen.getByRole('dialog')).toBeInTheDocument();
			});

			// Wait for the dashboard select to render AND finish loading (see note above).
			const modal = screen.getByRole('dialog');
			await waitFor(() => {
				const combobox = modal.querySelector('[role="combobox"]');
				expect(combobox).toBeTruthy();
				expect(combobox).not.toBeDisabled();
			});

			const dashboardSelect = modal.querySelector(
				'[role="combobox"]',
			) as HTMLElement;
			expect(dashboardSelect).toBeInTheDocument();
			await user.click(dashboardSelect);

			// Wait for the dropdown options to appear and select the dashboard
			await waitFor(() => {
				expect(screen.getByText(dashboards[0].title)).toBeInTheDocument();
			});

			// Click on the dashboard option
			const dashboardOption = screen.getByText(dashboards[0].title);
			await user.click(dashboardOption);

			// Wait for the selection to be made and the export button to be enabled
			await waitFor(() => {
				expect(screen.getByTestId('export-panel-export')).not.toBeDisabled();
			});

			// Click the export button
			const exportButton = screen.getByTestId('export-panel-export');
			await user.click(exportButton);

			// Wait for the handleExport function to be called and navigation to occur
			await waitFor(() => {
				expect(mockSafeNavigate).toHaveBeenCalledTimes(1);
				expect(mockSafeNavigate).toHaveBeenCalledWith(
					`/dashboard/${TEST_DASHBOARD_ID}/new?graphType=${panelTypeParam}&widgetId=${widgetId}&${serialize(
						query,
					).toString()}`,
				);
			});

			// Assert that useUpdateDashboard was NOT called (as per PR #8029)
			expect(mockMutate).not.toHaveBeenCalled();
		});
	});

	it('should not show export buttons when component is disabled', () => {
		const testOnExport = jest.fn() as jest.MockedFunction<
			(
				dashboard: ExportDashboard | null,
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
