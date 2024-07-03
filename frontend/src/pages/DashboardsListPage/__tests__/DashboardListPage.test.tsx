/* eslint-disable sonarjs/no-duplicate-string */
import ROUTES from 'constants/routes';
import DashboardsList from 'container/ListOfDashboard';
import { DashboardProvider } from 'providers/Dashboard/Dashboard';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, waitFor } from 'tests/test-utils';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: jest.fn(),
	useRouteMatch: jest.fn().mockReturnValue({
		params: {
			dashboardId: 4,
		},
	}),
}));

describe('dashboard list page', () => {
	it('should render the list even when the columnKey or the order is mismatched', async () => {
		const mockLocation = {
			pathname: `${process.env.FRONTEND_API_ENDPOINT}/${ROUTES.ALL_DASHBOARD}/`,
			search: `columnKey=asgard&order=stones&page=1`,
		};
		(useLocation as jest.Mock).mockReturnValue(mockLocation);
		const { getByText, getByTestId } = render(
			<MemoryRouter
				initialEntries={['/dashbords?columnKey=asgard&order=stones&page=1']}
			>
				<DashboardProvider>
					<DashboardsList />
				</DashboardProvider>
			</MemoryRouter>,
		);

		await waitFor(() => expect(getByText('All Dashboards')).toBeInTheDocument());
		const firstElement = getByTestId('dashboard-title-0');
		expect(firstElement.textContent).toBe('captain america');
		const secondElement = getByTestId('dashboard-title-1');
		expect(secondElement.textContent).toBe('thor');
	});
	it('should render the list even when the columnKey or the order is mismatched', async () => {
		const mockLocation = {
			pathname: `${process.env.FRONTEND_API_ENDPOINT}/${ROUTES.ALL_DASHBOARD}/`,
			search: `columnKey=createdAt&order=descend&page=1`,
		};
		(useLocation as jest.Mock).mockReturnValue(mockLocation);
		const { getByText, getByTestId } = render(
			<MemoryRouter
				initialEntries={['/dashbords?columnKey=createdAt&order=descend&page=1']}
			>
				<DashboardProvider>
					<DashboardsList />
				</DashboardProvider>
			</MemoryRouter>,
		);

		await waitFor(() => expect(getByText('All Dashboards')).toBeInTheDocument());
		const firstElement = getByTestId('dashboard-title-0');
		expect(firstElement.textContent).toBe('thor');
		const secondElement = getByTestId('dashboard-title-1');
		expect(secondElement.textContent).toBe('captain america');
	});

	it('should filter dashboards based on search string', async () => {
		const mockLocation = {
			pathname: `${process.env.FRONTEND_API_ENDPOINT}/${ROUTES.ALL_DASHBOARD}/`,
			search: `columnKey=createdAt&order=descend&page=1&search=tho`,
		};
		(useLocation as jest.Mock).mockReturnValue(mockLocation);
		const { getByText, getByTestId, queryByText } = render(
			<MemoryRouter
				initialEntries={[
					'/dashbords?columnKey=createdAt&order=descend&page=1&search=tho',
				]}
			>
				<DashboardProvider>
					<DashboardsList />
				</DashboardProvider>
			</MemoryRouter>,
		);

		await waitFor(() => expect(getByText('All Dashboards')).toBeInTheDocument());
		const firstElement = getByTestId('dashboard-title-0');
		expect(firstElement.textContent).toBe('thor');
		expect(queryByText('captain america')).not.toBeInTheDocument();
	});
});
