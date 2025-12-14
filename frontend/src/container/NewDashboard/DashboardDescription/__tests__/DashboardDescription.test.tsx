/* eslint-disable sonarjs/no-identical-functions */
import { getNonIntegrationDashboardById } from 'mocks-server/__mockdata__/dashboards';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { DashboardProvider } from 'providers/Dashboard/Dashboard';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from 'tests/test-utils';

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

	it('should navigate to dashboard list with correct params and exclude variables', async () => {
		const dashboardUrlWithVariables = `${DASHBOARD_PATH}?variables=%7B%22var1%22%3A%22value1%22%7D&otherParam=test`;
		const mockLocation = {
			pathname: DASHBOARD_PATH,
			search: '?variables=%7B%22var1%22%3A%22value1%22%7D&otherParam=test',
		};

		(useLocation as jest.Mock).mockReturnValue(mockLocation);

		const { getByText } = render(
			<MemoryRouter initialEntries={[dashboardUrlWithVariables]}>
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

		// Click the dashboard breadcrumb to navigate back to list
		const dashboardButton = getByText('Dashboard /');
		fireEvent.click(dashboardButton);

		// Verify navigation was called with correct URL
		expect(mockSafeNavigate).toHaveBeenCalledWith(
			'/dashboard?columnKey=updatedAt&order=descend&page=1&search=',
		);

		// Ensure the URL contains only essential dashboard list params
		const calledUrl = mockSafeNavigate.mock.calls[0][0] as string;
		const urlParams = new URLSearchParams(calledUrl.split('?')[1]);

		// Should have essential dashboard list params
		expect(urlParams.get('columnKey')).toBe('updatedAt');
		expect(urlParams.get('order')).toBe('descend');
		expect(urlParams.get('page')).toBe('1');
		expect(urlParams.get('search')).toBe('');

		// Should NOT have variables or other dashboard-specific params
		expect(urlParams.has('variables')).toBeFalsy();
		expect(urlParams.has('relativeTime')).toBeFalsy();
	});
});
