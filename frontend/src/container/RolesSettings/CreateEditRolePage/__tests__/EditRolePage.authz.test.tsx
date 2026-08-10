import { Route, Switch } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen } from 'tests/test-utils';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
	setupAuthzDenyAll,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import { buildRoleUpdatePermission } from 'lib/authz/hooks/useAuthZ/permissions/role.permissions';

import CreateEditRolePage from '../CreateEditRolePage';

const EDIT_ROLE_ID = 'test-role-123';
const EDIT_ROLE_NAME = 'test-role';
const rolesApiBase = '*/api/v1/roles';

beforeEach(() => {
	server.use(
		rest.get(`${rolesApiBase}/:id`, (_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: {
						id: EDIT_ROLE_ID,
						name: EDIT_ROLE_NAME,
						description: 'Test role description',
						type: 'custom',
						transactionGroups: [],
					},
				}),
			),
		),
	);
});

afterEach(() => {
	server.resetHandlers();
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
		it('shows PermissionDeniedCallout when read permission denied', async () => {
			server.use(setupAuthzDenyAll());

			renderEditPage();

			await expect(
				screen.findByText(/is not authorized to perform/i),
			).resolves.toBeInTheDocument();

			expect(
				screen.queryByText('Uh-oh! You are not authorized'),
			).not.toBeInTheDocument();
		});

		it('keeps the header visible and hides the form when read permission denied', async () => {
			server.use(setupAuthzDenyAll());

			renderEditPage();

			await screen.findByText(/is not authorized to perform/i);

			await expect(
				screen.findByText(`Role - ${EDIT_ROLE_NAME}`),
			).resolves.toBeInTheDocument();
			expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
			expect(screen.getByTestId('save-button')).toBeDisabled();

			expect(
				screen.queryByTestId('role-description-input'),
			).not.toBeInTheDocument();
			expect(screen.queryByTestId('permission-editor')).not.toBeInTheDocument();
		});

		it('renders page with disabled save button when update permission denied but read granted', async () => {
			server.use(setupAuthzDeny(buildRoleUpdatePermission(EDIT_ROLE_NAME)));

			renderEditPage();

			await expect(
				screen.findByText(`Role - ${EDIT_ROLE_NAME}`),
			).resolves.toBeInTheDocument();

			const saveButton = await screen.findByTestId('save-button');
			expect(saveButton).toBeDisabled();
		});
	});

	describe('route without the name query param', () => {
		// `roleName` is the permission selector. When it is missing we must skip the
		// check entirely — building `role:` widens to `role:*` on the wire and never
		// matches back, which would deny the form even for an admin.
		it('renders the form instead of denying it', async () => {
			server.use(setupAuthzAdmin());

			render(
				<Switch>
					<Route path={ROUTES.ROLES_SETTINGS} exact>
						<div data-testid="roles-list-redirect" />
					</Route>
					<Route path={ROUTES.ROLE_DETAILS}>
						<CreateEditRolePage />
					</Route>
				</Switch>,
				undefined,
				{ initialRoute: `/settings/roles/${EDIT_ROLE_ID}` },
			);

			await expect(
				screen.findByTestId('role-description-input'),
			).resolves.toBeInTheDocument();

			expect(
				screen.queryByText(/is not authorized to perform/i),
			).not.toBeInTheDocument();
		});
	});

	describe('loading state', () => {
		it('shows skeleton while checking permissions', async () => {
			server.use(
				rest.post('*/api/v1/authz/check', (_req, res, ctx) =>
					res(
						ctx.delay(200),
						ctx.status(200),
						ctx.json({ data: [], status: 'success' }),
					),
				),
			);

			renderEditPage();

			expect(document.querySelector('.ant-skeleton')).toBeInTheDocument();
		});
	});

	describe('permission check failure', () => {
		it('renders the form when the permission check request fails', async () => {
			server.use(
				rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.status(500))),
			);

			renderEditPage();

			await expect(
				screen.findByTestId('role-description-input'),
			).resolves.toBeInTheDocument();
			expect(
				screen.queryByText(/is not authorized to perform/i),
			).not.toBeInTheDocument();
		});
	});

	describe('permission granted', () => {
		it('renders edit page when both read and update permissions granted', async () => {
			server.use(setupAuthzAdmin());

			renderEditPage();

			await expect(
				screen.findByText(`Role - ${EDIT_ROLE_NAME}`),
			).resolves.toBeInTheDocument();
		});
	});
});
