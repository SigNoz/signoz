/* eslint-disable sonarjs/no-duplicate-string */
import ROUTES from 'constants/routes';
import DashboardsList from 'container/ListOfDashboard';
import * as dashboardUtils from 'container/NewDashboard/DashboardDescription';
import {
	dashboardEmptyState,
	dashboardSuccessResponse,
} from 'mocks-server/__mockdata__/dashboards';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { DashboardProvider } from 'providers/Dashboard/Dashboard';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { fireEvent, render, waitFor } from 'tests/test-utils';

jest.mock('container/NewDashboard/DashboardDescription', () => ({
	sanitizeDashboardData: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: jest.fn(),
	useRouteMatch: jest.fn().mockReturnValue({
		params: {
			dashboardId: 4,
		},
	}),
}));

const mockWindowOpen = jest.fn();
window.open = mockWindowOpen;

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

describe('dashboard list page', () => {
	// should render on updatedAt and descend when the column key and order is messed up
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

	// should render correctly when the column key is createdAt and order is descend
	it('should render the list even when the columnKey and the order are given', async () => {
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

	// change the sort by order and dashboards list ot be updated accordingly
	it('dashboards list should be correctly updated on choosing the different sortBy from dropdown values', async () => {
		const { getByText, getByTestId } = render(
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
		const secondElement = getByTestId('dashboard-title-1');
		expect(secondElement.textContent).toBe('captain america');

		// click on the sort button
		const sortByButton = getByTestId('sort-by');
		expect(sortByButton).toBeInTheDocument();
		fireEvent.click(sortByButton!);

		// change the sort order
		const sortByUpdatedBy = getByTestId('sort-by-last-updated');
		await waitFor(() => expect(sortByUpdatedBy).toBeInTheDocument());
		fireEvent.click(sortByUpdatedBy!);

		// expect the new order
		const updatedFirstElement = getByTestId('dashboard-title-0');
		expect(updatedFirstElement.textContent).toBe('captain america');
		const updatedSecondElement = getByTestId('dashboard-title-1');
		expect(updatedSecondElement.textContent).toBe('thor');
	});

	// should filter correctly on search string
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

		// the pagination item should not be present in the list when number of items are less than one page size
		expect(
			document.querySelector('.ant-table-pagination'),
		).not.toBeInTheDocument();
	});

	it('dashboard empty search state', async () => {
		const mockLocation = {
			pathname: `${process.env.FRONTEND_API_ENDPOINT}/${ROUTES.ALL_DASHBOARD}/`,
			search: `columnKey=createdAt&order=descend&page=1&search=someRandomString`,
		};
		(useLocation as jest.Mock).mockReturnValue(mockLocation);
		const { getByText } = render(
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

		await waitFor(() =>
			expect(
				getByText(
					'No dashboards found for someRandomString. Create a new dashboard?',
				),
			).toBeInTheDocument(),
		);
	});

	it('dashboard empty state', async () => {
		const mockLocation = {
			pathname: `${process.env.FRONTEND_API_ENDPOINT}/${ROUTES.ALL_DASHBOARD}/`,
			search: `columnKey=createdAt&order=descend&page=1`,
		};
		(useLocation as jest.Mock).mockReturnValue(mockLocation);
		server.use(
			rest.get('http://localhost/api/v1/dashboards', (_, res, ctx) =>
				res(ctx.status(200), ctx.json(dashboardEmptyState)),
			),
		);
		const { getByText, getByTestId } = render(
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

		await waitFor(() =>
			expect(getByText('No dashboards yet.')).toBeInTheDocument(),
		);

		const learnMoreButton = getByTestId('learn-more');
		expect(learnMoreButton).toBeInTheDocument();
		fireEvent.click(learnMoreButton);

		// test the correct link to be added for the dashboards empty state
		await waitFor(() =>
			expect(mockWindowOpen).toHaveBeenCalledWith(
				'https://signoz.io/docs/userguide/manage-dashboards?utm_source=product&utm_medium=dashboard-list-empty-state',
				'_blank',
			),
		);
	});

	it('ensure that the export JSON popover action works correctly', async () => {
		const { getByText, getAllByTestId } = render(<DashboardsList />);

		await waitFor(() => {
			const popovers = getAllByTestId('dashboard-action-icon');
			expect(popovers).toHaveLength(dashboardSuccessResponse.data.length);
			fireEvent.click([...popovers[0].children][0]);
		});

		const exportJsonBtn = getByText('Export JSON');
		expect(exportJsonBtn).toBeInTheDocument();
		fireEvent.click(exportJsonBtn);
		const firstDashboardData = dashboardSuccessResponse.data[0];
		expect(dashboardUtils.sanitizeDashboardData).toHaveBeenCalledWith(
			expect.objectContaining({
				id: firstDashboardData.uuid,
				title: firstDashboardData.data.title,
				createdAt: firstDashboardData.created_at,
			}),
		);
	});
});
