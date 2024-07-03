import ROUTES from 'constants/routes';
import DashboardsList from 'container/ListOfDashboard';
import { DashboardProvider } from 'providers/Dashboard/Dashboard';
import { MemoryRouter } from 'react-router-dom';
import { render, waitFor } from 'tests/test-utils';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}/${ROUTES.ALL_DASHBOARD}/`,
	}),
}));

describe('dashboard list page', () => {
	it.skip('should render the list even when the columnKey or the order is mismatched', async () => {
		const { container } = render(
			<MemoryRouter
				initialEntries={['/dashbords?columnKey=asgard&order=stones&page=1']}
			>
				<DashboardProvider>
					<DashboardsList />
				</DashboardProvider>
			</MemoryRouter>,
		);

		await waitFor(() => expect(container).toMatchSnapshot());
	});
});
