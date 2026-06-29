import { Route, Switch } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { useAuthZ } from 'hooks/useAuthZ/useAuthZ';
import { render, screen } from 'tests/test-utils';
import {
	mockUseAuthZDenyAll,
	mockUseAuthZGrantByPrefix,
} from 'tests/authz-test-utils';

import CreateEditRolePage from '../CreateEditRolePage';

jest.mock('hooks/useAuthZ/useAuthZ');
const mockUseAuthZ = useAuthZ as jest.MockedFunction<typeof useAuthZ>;

const EDIT_ROLE_ID = 'test-role-123';
const EDIT_ROLE_NAME = 'test-role';

afterEach(() => {
	jest.clearAllMocks();
});

function renderEditPage(): ReturnType<typeof render> {
	return render(
		<Switch>
			<Route path={ROUTES.ROLES_SETTINGS} exact>
				<div data-testid="roles-list-redirect" />
			</Route>
			<Route path={ROUTES.ROLE_DETAILS}>
				<CreateEditRolePage />
			</Route>
		</Switch>,
		undefined,
		{ initialRoute: `/settings/roles/${EDIT_ROLE_ID}?name=${EDIT_ROLE_NAME}` },
	);
}

describe('EditRolePage - AuthZ', () => {
	describe('permission denied', () => {
		it('shows PermissionDeniedFullPage when read permission denied', async () => {
			mockUseAuthZ.mockImplementation(mockUseAuthZDenyAll);

			renderEditPage();

			await expect(
				screen.findByText(/You are not authorized/i),
			).resolves.toBeInTheDocument();
		});

		it('shows PermissionDeniedFullPage when update permission denied but read granted', async () => {
			mockUseAuthZ.mockImplementation(mockUseAuthZGrantByPrefix('read'));

			renderEditPage();

			await expect(
				screen.findByText(/You are not authorized/i),
			).resolves.toBeInTheDocument();
		});

		it('checks both read and update permissions for edit mode', () => {
			mockUseAuthZ.mockImplementation(mockUseAuthZDenyAll);

			renderEditPage();

			expect(mockUseAuthZ).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.stringContaining('read'),
					expect.stringContaining('update'),
				]),
			);
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

			renderEditPage();

			expect(document.querySelector('.ant-skeleton')).toBeInTheDocument();
		});
	});
});
