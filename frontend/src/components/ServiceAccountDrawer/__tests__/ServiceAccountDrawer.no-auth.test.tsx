import type { ReactNode } from 'react';
import { listRolesSuccessResponse } from 'mocks-server/__mockdata__/roles';
import { rest, server } from 'mocks-server/server';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { screen, waitFor } from 'tests/test-utils';
import { renderWithNoAuth } from 'tests/no-auth-test-utils';

import ServiceAccountDrawer from '../ServiceAccountDrawer';

const ROLES_ENDPOINT = '*/api/v1/roles';
const SA_KEYS_ENDPOINT = '*/api/v1/service_accounts/:id/keys';
const SA_ENDPOINT = '*/api/v1/service_accounts/sa-1';
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
): ReturnType<typeof renderWithNoAuth> {
	return renderWithNoAuth(
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
		rest.delete(SA_ENDPOINT, (_, res, ctx) =>
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

describe('ServiceAccountDrawer — no-auth mode', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		setupBaseHandlers();
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders no-auth guards in the Overview tab footer', async () => {
		renderDrawer();

		await waitFor(() => {
			expect(
				screen.getByTestId('no-auth-delete-service-account'),
			).toBeInTheDocument();
			expect(
				screen.getByTestId('no-auth-save-service-account'),
			).toBeInTheDocument();
		});
	});

	it('renders no-auth guard on Add Key button in Keys tab header', async () => {
		renderDrawer({ account: 'sa-1', tab: 'keys' });

		await waitFor(() => {
			expect(screen.getByTestId('no-auth-add-key')).toBeInTheDocument();
		});
	});

	it('does not render no-auth guards when drawer is closed', () => {
		renderDrawer({});

		expect(
			screen.queryByTestId('no-auth-delete-service-account'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('no-auth-save-service-account'),
		).not.toBeInTheDocument();
	});
});
