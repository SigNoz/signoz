import { Route, Switch } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { useAuthZ } from 'hooks/useAuthZ/useAuthZ';
import { render, screen } from 'tests/test-utils';
import { mockUseAuthZDenyAll } from 'tests/authz-test-utils';

import CreateEditRolePage from '../CreateEditRolePage';

jest.mock('hooks/useAuthZ/useAuthZ');
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
		// TODO: Create mode doesn't check create permission - useRoleAuthZ only checks
		// read/update/delete for EXISTING roles. When roleName is empty (create mode),
		// permissions default to true. Need to add create permission check to component.
		it.skip('shows PermissionDeniedFullPage when create permission denied', () => {
			mockUseAuthZ.mockImplementation(mockUseAuthZDenyAll);

			renderCreatePage();

			expect(screen.getByText(/You are not authorized/i)).toBeInTheDocument();
		});
	});

	describe('loading state', () => {
		it('shows skeleton while checking permissions', () => {
			mockUseAuthZ.mockReturnValue({
				isLoading: true,
				isFetching: true,
				error: null,
				permissions: null,
				refetchPermissions: jest.fn(),
			});

			renderCreatePage();

			expect(document.querySelector('.ant-skeleton')).toBeInTheDocument();
		});
	});
});
