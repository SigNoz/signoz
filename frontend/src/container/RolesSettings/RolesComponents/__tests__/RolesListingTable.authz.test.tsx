import { listRolesSuccessResponse } from 'mocks-server/__mockdata__/roles';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';
import { render, screen } from 'tests/test-utils';

import RolesListingTable from '../RolesListingTable';

const rolesApiBase = '*/api/v1/roles';

beforeEach(() => {
	server.use(
		rest.get(rolesApiBase, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(listRolesSuccessResponse)),
		),
	);
});

afterEach(() => {
	server.resetHandlers();
});

function renderTable(): ReturnType<typeof render> {
	return render(<RolesListingTable searchQuery="" />, undefined, {
		initialRoute: '/settings/roles',
	});
}

describe('RolesListingTable - AuthZ', () => {
	describe('permission granted', () => {
		it('renders the roles table when list permission granted', async () => {
			server.use(setupAuthzAdmin());

			renderTable();

			await expect(
				screen.findByText('billing-manager'),
			).resolves.toBeInTheDocument();
		});
	});

	describe('permission denied', () => {
		it('shows inline permission denial instead of the table when list permission denied', async () => {
			server.use(setupAuthzDenyAll());

			renderTable();

			await expect(
				screen.findByText(/is not authorized to perform/i),
			).resolves.toBeInTheDocument();

			expect(screen.queryByText('billing-manager')).not.toBeInTheDocument();

			// denial is inline, not a full page takeover
			expect(
				screen.queryByText('Uh-oh! You are not authorized'),
			).not.toBeInTheDocument();
		});
	});

	describe('permission check failure', () => {
		it('renders the roles table when the permission check request fails', async () => {
			server.use(
				rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.status(500))),
			);

			renderTable();

			await expect(
				screen.findByText('billing-manager'),
			).resolves.toBeInTheDocument();
			expect(
				screen.queryByText(/is not authorized to perform/i),
			).not.toBeInTheDocument();
		});
	});
});
