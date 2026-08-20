import {
	listRolesSuccessResponse,
	managedRoles,
} from 'mocks-server/__mockdata__/roles';
import { rest, server } from 'mocks-server/server';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { fireEvent, render, screen, waitFor } from 'tests/test-utils';
import {
	setupAuthzAdmin,
	setupAuthzDeny,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';
import {
	APIKeyListPermission,
	buildSADeletePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/service-account.permissions';

import ServiceAccountDrawer from '../ServiceAccountDrawer';

const ROLES_ENDPOINT = '*/api/v1/roles';
const SA_KEYS_ENDPOINT = '*/api/v1/service_accounts/:id/keys';
const SA_ENDPOINT = '*/api/v1/service_accounts/sa-1';
const SA_DELETE_ENDPOINT = '*/api/v1/service_accounts/sa-1';
const SA_ROLES_ENDPOINT = '*/api/v1/service_account_roles';
const SA_ROLE_DELETE_ENDPOINT = '*/api/v1/service_account_roles/:id';

const activeAccountResponse = {
	id: 'sa-1',
	name: 'CI Bot',
	email: 'ci-bot@signoz.io',
	status: 'ACTIVE',
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-02T00:00:00Z',
	serviceAccountRoles: [
		{
			id: 'sar-admin-1',
			serviceAccountId: 'sa-1',
			roleId: managedRoles[0].id,
			role: { ...managedRoles[0], transactionGroups: [] },
		},
	],
};

function renderDrawer(
	searchParams: Record<string, string> = { account: 'sa-1' },
): ReturnType<typeof render> {
	return render(
		<NuqsTestingAdapter searchParams={searchParams} hasMemory>
			<ServiceAccountDrawer onSuccess={jest.fn()} />
		</NuqsTestingAdapter>,
	);
}

function setupBaseHandlers(): void {
	server.use(
		rest.get(ROLES_ENDPOINT, (_, res, ctx) =>
			res(ctx.status(200), ctx.json(listRolesSuccessResponse)),
		),
		rest.get(SA_KEYS_ENDPOINT, (_, res, ctx) =>
			res(ctx.status(200), ctx.json({ data: [] })),
		),
		rest.get(SA_ENDPOINT, (_, res, ctx) =>
			res(ctx.status(200), ctx.json({ data: activeAccountResponse })),
		),
		rest.put(SA_ENDPOINT, (_, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: {} })),
		),
		rest.delete(SA_DELETE_ENDPOINT, (_, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: {} })),
		),
		rest.post(SA_ROLES_ENDPOINT, (_, res, ctx) =>
			res(
				ctx.status(201),
				ctx.json({ status: 'success', data: { id: 'sar-new' } }),
			),
		),
		rest.delete(SA_ROLE_DELETE_ENDPOINT, (_, res, ctx) => res(ctx.status(204))),
	);
}

describe('ServiceAccountDrawer — permissions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		setupBaseHandlers();
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('shows PermissionDeniedCallout inside drawer when read permission is denied', async () => {
		server.use(setupAuthzDenyAll());

		renderDrawer();

		await waitFor(() => {
			expect(screen.getByText(/read:serviceaccount/)).toBeInTheDocument();
		});
	});

	it('shows drawer content when read permission is granted', async () => {
		server.use(setupAuthzAdmin());

		renderDrawer();

		await screen.findByDisplayValue('CI Bot');
		expect(screen.queryByText(/serviceaccount:read/)).not.toBeInTheDocument();
	});

	it('shows PermissionDeniedCallout in Keys tab when list-keys permission is denied', async () => {
		server.use(setupAuthzDeny(APIKeyListPermission));

		renderDrawer();
		await screen.findByDisplayValue('CI Bot');

		fireEvent.click(screen.getByRole('radio', { name: /keys/i }));

		await waitFor(() => {
			expect(screen.getByText(/list:factor-api-key/)).toBeInTheDocument();
		});
	});

	it('disables Delete button when delete permission is denied', async () => {
		server.use(setupAuthzDeny(buildSADeletePermission('sa-1')));

		renderDrawer();
		await screen.findByDisplayValue('CI Bot');

		const deleteBtn = screen.getByRole('button', {
			name: /Delete Service Account/i,
		});
		await waitFor(() => expect(deleteBtn).toBeDisabled());
	});
});
