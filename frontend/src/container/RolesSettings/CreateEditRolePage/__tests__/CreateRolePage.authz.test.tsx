import { Route, Switch } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { render, screen } from 'tests/test-utils';
import { mockUseAuthZDenyAll } from 'lib/authz/utils/authz-test-utils';

import CreateEditRolePage from '../CreateEditRolePage';

jest.mock('lib/authz/hooks/useAuthZ/useAuthZ');
const mockUseAuthZ = useAuthZ as jest.MockedFunction<typeof useAuthZ>;

afterEach(() => {
	jest.clearAllMocks();
});

function renderCreatePage(): ReturnType<typeof render> {
	return render(
		<Switch>
			<Route path={ROUTES.ROLES_SETTINGS} exact>
				<div data-testid="roles-list-redirect" />
			</Route>
			<Route path={ROUTES.ROLE_CREATE}>
				<CreateEditRolePage />
			</Route>
		</Switch>,
		undefined,
		{ initialRoute: '/settings/roles/new' },
	);
}

describe('CreateRolePage - AuthZ', () => {
	describe('permission denied', () => {
		it('shows PermissionDeniedFullPage when create permission denied', async () => {
			mockUseAuthZ.mockImplementation(mockUseAuthZDenyAll);

			renderCreatePage();

			await expect(
				screen.findByText(/You are not authorized/i),
			).resolves.toBeInTheDocument();
		});
	});

	describe('loading state', () => {
		it('shows skeleton while checking permissions', () => {
			mockUseAuthZ.mockReturnValue({
				isLoading: true,
				isFetching: true,
				error: null,
				permissions: null,
				allowed: false,
				deniedPermissions: [],
				refetchPermissions: jest.fn(),
			});

			renderCreatePage();

			expect(document.querySelector('.ant-skeleton')).toBeInTheDocument();
		});
	});
});
