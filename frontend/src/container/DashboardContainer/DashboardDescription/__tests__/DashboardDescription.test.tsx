/* eslint-disable sonarjs/no-identical-functions */
import { MemoryRouter, useLocation } from 'react-router-dom';
import {
	getDashboardById,
	getNonIntegrationDashboardById,
} from 'mocks-server/__mockdata__/dashboards';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	DashboardContext,
	DashboardProvider,
} from 'providers/Dashboard/Dashboard';
import { IDashboardContext } from 'providers/Dashboard/types';
import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
} from 'tests/test-utils';
import { Dashboard } from 'types/api/dashboard/getAll';

import DashboardDescription from '..';

interface MockSafeNavigateReturn {
	safeNavigate: jest.MockedFunction<(url: string) => void>;
}

const DASHBOARD_TEST_ID = 'dashboard-title';
const DASHBOARD_TITLE_TEXT = 'thor';
const DASHBOARD_PATH = '/dashboard/4';

const mockSafeNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: jest.fn(),
	useRouteMatch: jest.fn().mockReturnValue({
		params: {
			dashboardId: 4,
		},
	}),
}));

jest.mock(
	'container/TopNav/DateTimeSelectionV2/index.tsx',
	() =>
		function MockDateTimeSelection(): JSX.Element {
			return <div>MockDateTimeSelection</div>;
		},
);

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): MockSafeNavigateReturn => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

describe('Dashboard landing page actions header tests', () => {
	beforeEach(() => {
		mockSafeNavigate.mockClear();
		sessionStorage.clear();
	});

	it('unlock dashboard should be disabled for integrations created dashboards', async () => {
		const mockLocation = {
			pathname: `${process.env.FRONTEND_API_ENDPOINT}${DASHBOARD_PATH}`,
			search: '',
		};
		(useLocation as jest.Mock).mockReturnValue(mockLocation);
		const { getByTestId } = render(
			<MemoryRouter initialEntries={[DASHBOARD_PATH]}>
				<DashboardProvider>
					<DashboardDescription
						handle={{
							active: false,
							enter: (): Promise<void> => Promise.resolve(),
							exit: (): Promise<void> => Promise.resolve(),
							node: { current: null },
						}}
					/>
				</DashboardProvider>
			</MemoryRouter>,
		);

		await waitFor(() =>
			expect(getByTestId(DASHBOARD_TEST_ID)).toHaveTextContent(
				DASHBOARD_TITLE_TEXT,
			),
		);

		const dashboardSettingsTrigger = getByTestId('options');

		await fireEvent.click(dashboardSettingsTrigger);

		const lockUnlockButton = screen.getByTestId('lock-unlock-dashboard');

		await waitFor(() => expect(lockUnlockButton).toBeDisabled());
	});

	it('unlock dashboard should not be disabled for non integration created dashboards', async () => {
		const mockLocation = {
			pathname: `${process.env.FRONTEND_API_ENDPOINT}${DASHBOARD_PATH}`,
			search: '',
		};
		(useLocation as jest.Mock).mockReturnValue(mockLocation);
		server.use(
			rest.get('http://localhost/api/v1/dashboards/4', (_, res, ctx) =>
				res(ctx.status(200), ctx.json(getNonIntegrationDashboardById)),
			),
		);
		const { getByTestId } = render(
			<MemoryRouter initialEntries={[DASHBOARD_PATH]}>
				<DashboardProvider>
					<DashboardDescription
						handle={{
							active: false,
							enter: (): Promise<void> => Promise.resolve(),
							exit: (): Promise<void> => Promise.resolve(),
							node: { current: null },
						}}
					/>
				</DashboardProvider>
			</MemoryRouter>,
		);

		await waitFor(() =>
			expect(getByTestId(DASHBOARD_TEST_ID)).toHaveTextContent(
				DASHBOARD_TITLE_TEXT,
			),
		);

		const dashboardSettingsTrigger = getByTestId('options');

		await fireEvent.click(dashboardSettingsTrigger);

		const lockUnlockButton = screen.getByTestId('lock-unlock-dashboard');

		await waitFor(() => expect(lockUnlockButton).not.toBeDisabled());
	});

	it('should navigate to base dashboard list URL when no saved params exist', async () => {
		const user = userEvent.setup();
		const mockLocation = {
			pathname: DASHBOARD_PATH,
			search: '',
		};

		(useLocation as jest.Mock).mockReturnValue(mockLocation);

		const { getByText } = render(
			<MemoryRouter initialEntries={[DASHBOARD_PATH]}>
				<DashboardProvider>
					<DashboardDescription
						handle={{
							active: false,
							enter: (): Promise<void> => Promise.resolve(),
							exit: (): Promise<void> => Promise.resolve(),
							node: { current: null },
						}}
					/>
				</DashboardProvider>
			</MemoryRouter>,
		);

		await waitFor(() =>
			expect(screen.getByTestId(DASHBOARD_TEST_ID)).toHaveTextContent(
				DASHBOARD_TITLE_TEXT,
			),
		);

		const dashboardButton = getByText('Dashboard /');
		await user.click(dashboardButton);

		expect(mockSafeNavigate).toHaveBeenCalledWith('/dashboard');
	});

	it('should navigate to dashboard list with saved query params when present', async () => {
		const user = userEvent.setup();
		const savedParams = 'columnKey=createdAt&order=ascend&page=2&search=foo';
		sessionStorage.setItem('dashboardsListQueryParams', savedParams);

		const mockLocation = {
			pathname: DASHBOARD_PATH,
			search: '',
		};

		(useLocation as jest.Mock).mockReturnValue(mockLocation);

		const mockContextValue: IDashboardContext = {
			isDashboardSliderOpen: false,
			isDashboardLocked: false,
			handleToggleDashboardSlider: jest.fn(),
			handleDashboardLockToggle: jest.fn(),
			dashboardResponse: {} as IDashboardContext['dashboardResponse'],
			selectedDashboard: (getDashboardById.data as unknown) as Dashboard,
			dashboardId: '4',
			layouts: [],
			panelMap: {},
			setPanelMap: jest.fn(),
			setLayouts: jest.fn(),
			setSelectedDashboard: jest.fn(),
			updatedTimeRef: { current: null },
			toScrollWidgetId: '',
			setToScrollWidgetId: jest.fn(),
			updateLocalStorageDashboardVariables: jest.fn(),
			dashboardQueryRangeCalled: false,
			setDashboardQueryRangeCalled: jest.fn(),
			selectedRowWidgetId: null,
			setSelectedRowWidgetId: jest.fn(),
			isDashboardFetching: false,
			columnWidths: {},
			setColumnWidths: jest.fn(),
		};

		const { getByText } = render(
			<MemoryRouter initialEntries={[DASHBOARD_PATH]}>
				<DashboardContext.Provider value={mockContextValue}>
					<DashboardDescription
						handle={{
							active: false,
							enter: (): Promise<void> => Promise.resolve(),
							exit: (): Promise<void> => Promise.resolve(),
							node: { current: null },
						}}
					/>
				</DashboardContext.Provider>
			</MemoryRouter>,
		);

		await waitFor(() =>
			expect(screen.getByTestId(DASHBOARD_TEST_ID)).toHaveTextContent(
				DASHBOARD_TITLE_TEXT,
			),
		);

		const dashboardButton = getByText('Dashboard /');
		await user.click(dashboardButton);

		expect(mockSafeNavigate).toHaveBeenCalledWith({
			pathname: '/dashboard',
			search: `?${savedParams}`,
		});
	});
});
