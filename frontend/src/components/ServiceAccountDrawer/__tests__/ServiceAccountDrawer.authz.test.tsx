import type { ReactNode } from 'react';
import { listRolesSuccessResponse } from 'mocks-server/__mockdata__/roles';
import { rest, server } from 'mocks-server/server';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { fireEvent, render, screen, waitFor } from 'tests/test-utils';
import {
	setupAuthzAdmin,
	setupAuthzDeny,
	setupAuthzDenyAll,
} from 'tests/authz-test-utils';
import {
	APIKeyListPermission,
	buildSADeletePermission,
} from 'hooks/useAuthZ/permissions/service-account.permissions';

import ServiceAccountDrawer from '../ServiceAccountDrawer';

const ROLES_ENDPOINT = '*/api/v1/roles';
const SA_KEYS_ENDPOINT = '*/api/v1/service_accounts/:id/keys';
const SA_ENDPOINT = '*/api/v1/service_accounts/sa-1';
const SA_DELETE_ENDPOINT = '*/api/v1/service_accounts/sa-1';
const SA_ROLES_ENDPOINT = '*/api/v1/service_accounts/:id/roles';
const SA_ROLE_DELETE_ENDPOINT = '*/api/v1/service_accounts/:id/roles/:rid';

const activeAccountResponse = {
	id: 'sa-1',
	name: 'CI Bot',
	email: 'ci-bot@signoz.io',
	roles: ['signoz-admin'],
	status: 'ACTIVE',
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-02T00:00:00Z',
};

jest.mock('@signozhq/ui/drawer', () => ({
	...jest.requireActual('@signozhq/ui/drawer'),
	DrawerWrapper: ({
		children,
		footer,
		open,
	}: {
		children?: ReactNode;
		footer?: ReactNode;
		open: boolean;
	}): JSX.Element | null =>
		open ? (
			<div>
				{children}
				{footer}
			</div>
		) : null,
}));

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: { success: jest.fn(), error: jest.fn() },
}));

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
		rest.get(SA_ROLES_ENDPOINT, (_, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({
					data: listRolesSuccessResponse.data.filter(
						(r) => r.name === 'signoz-admin',
					),
				}),
			),
		),
		rest.post(SA_ROLES_ENDPOINT, (_, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: {} })),
		),
		rest.delete(SA_ROLE_DELETE_ENDPOINT, (_, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: {} })),
		),
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
			expect(screen.getByText(/serviceaccount:read/)).toBeInTheDocument();
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
			expect(screen.getByText(/factor-api-key:list/)).toBeInTheDocument();
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
