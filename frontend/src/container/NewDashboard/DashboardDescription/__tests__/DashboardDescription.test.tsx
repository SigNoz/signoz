import { getNonIntegrationDashboardById } from 'mocks-server/__mockdata__/dashboards';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { DashboardProvider } from 'providers/Dashboard/Dashboard';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from 'tests/test-utils';

import DashboardDescription from '..';

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
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

describe('Dashboard landing page actions header tests', () => {
	it('unlock dashboard should be disabled for integrations created dashboards', async () => {
		const mockLocation = {
			pathname: `${process.env.FRONTEND_API_ENDPOINT}/dashboard/4`,
			search: '',
		};
		(useLocation as jest.Mock).mockReturnValue(mockLocation);
		const { getByTestId } = render(
			<MemoryRouter initialEntries={['/dashboard/4']}>
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
			expect(getByTestId('dashboard-title')).toHaveTextContent('thor'),
		);

		const dashboardSettingsTrigger = getByTestId('options');

		await fireEvent.click(dashboardSettingsTrigger);

		const lockUnlockButton = screen.getByTestId('lock-unlock-dashboard');

		await waitFor(() => expect(lockUnlockButton).toBeDisabled());
	});
	it('unlock dashboard should not be disabled for non integration created dashboards', async () => {
		const mockLocation = {
			pathname: `${process.env.FRONTEND_API_ENDPOINT}/dashboard/4`,
			search: '',
		};
		(useLocation as jest.Mock).mockReturnValue(mockLocation);
		server.use(
			rest.get('http://localhost/api/v1/dashboards/4', (_, res, ctx) =>
				res(ctx.status(200), ctx.json(getNonIntegrationDashboardById)),
			),
		);
		const { getByTestId } = render(
			<MemoryRouter initialEntries={['/dashboard/4']}>
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
			expect(getByTestId('dashboard-title')).toHaveTextContent('thor'),
		);

		const dashboardSettingsTrigger = getByTestId('options');

		await fireEvent.click(dashboardSettingsTrigger);

		const lockUnlockButton = screen.getByTestId('lock-unlock-dashboard');

		await waitFor(() => expect(lockUnlockButton).not.toBeDisabled());
	});
});
