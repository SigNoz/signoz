import { Route, Switch } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen } from 'tests/test-utils';
import {
	setupAuthzAdmin,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';

import CreateEditRolePage from '../CreateEditRolePage';

afterEach(() => {
	server.resetHandlers();
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
			server.use(setupAuthzDenyAll());

			renderCreatePage();

			await expect(
				screen.findByText(/You are not authorized/i),
			).resolves.toBeInTheDocument();
		});
	});

	describe('loading state', () => {
		it('shows skeleton while checking permissions', () => {
			server.use(
				rest.post('*/api/v1/authz/check', (_req, res, ctx) =>
					res(
						ctx.delay(200),
						ctx.status(200),
						ctx.json({ data: [], status: 'success' }),
					),
				),
			);

			renderCreatePage();

			expect(document.querySelector('.ant-skeleton')).toBeInTheDocument();
		});
	});

	describe('permission granted', () => {
		it('renders create page when create permission granted', async () => {
			server.use(setupAuthzAdmin());

			renderCreatePage();

			await expect(
				screen.findByTestId('role-name-input'),
			).resolves.toBeInTheDocument();
		});
	});
});
