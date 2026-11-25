import type { ServiceAccountRow } from 'container/ServiceAccountsSettings/utils';
import {
	listRolesSuccessResponse,
	managedRoles,
} from 'mocks-server/__mockdata__/roles';
import { rest, server } from 'mocks-server/server';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { render, screen, waitFor } from 'tests/test-utils';
import {
	setupAuthzAdmin,
	setupAuthzDeny,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';
import {
	APIKeyListPermission,
	buildSADeletePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/service-account.permissions';

import KeysTab from '../KeysTab';
import OverviewTab from '../OverviewTab';
import ServiceAccountDrawer from '../ServiceAccountDrawer';

const ROLES_ENDPOINT = '*/api/v1/roles';
const SA_KEYS_ENDPOINT = '*/api/v1/service_accounts/:id/keys';
const SA_ENDPOINT = '*/api/v1/service_accounts/sa-1';

const account: ServiceAccountRow = {
	id: 'sa-1',
	name: 'CI Bot',
	email: 'ci-bot@signoz.io',
	status: 'ACTIVE',
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-02T00:00:00Z',
};

const activeAccountResponse = {
	...account,
	serviceAccountRoles: [
		{
			id: 'sar-admin-1',
			serviceAccountId: 'sa-1',
			roleId: managedRoles[0].id,
			role: { ...managedRoles[0], transactionGroups: [] },
		},
	],
};

function renderOverviewTab(): ReturnType<typeof render> {
	return render(
		<OverviewTab
			account={account}
			localName="CI Bot"
			onNameChange={jest.fn()}
			localRoles={[]}
			onRolesChange={jest.fn()}
			isDisabled={false}
			availableRoles={[]}
		/>,
	);
}

describe('ServiceAccountDrawer — permissions', () => {
	it('shows PermissionDeniedCallout in the Overview tab when read permission is denied', async () => {
		server.use(setupAuthzDenyAll());

		renderOverviewTab();

		await expect(
			screen.findByTestId('permission-denied-callout'),
		).resolves.toHaveTextContent('read:serviceaccount:sa-1');
	});

	it('shows Overview tab content when read permission is granted', async () => {
		server.use(setupAuthzAdmin());

		renderOverviewTab();

		await screen.findByDisplayValue('CI Bot');
		expect(
			screen.queryByTestId('permission-denied-callout'),
		).not.toBeInTheDocument();
	});

	it('shows PermissionDeniedCallout in Keys tab when list-keys permission is denied', async () => {
		server.use(setupAuthzDeny(APIKeyListPermission));

		render(
			<KeysTab
				keys={[]}
				isLoading={false}
				accountId="sa-1"
				currentPage={1}
				pageSize={15}
				onPageChange={jest.fn()}
			/>,
		);

		await expect(
			screen.findByTestId('permission-denied-callout'),
		).resolves.toHaveTextContent('list:factor-api-key:*');
	});

	it('disables Delete button when delete permission is denied', async () => {
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
			setupAuthzDeny(buildSADeletePermission('sa-1')),
		);

		render(
			<NuqsTestingAdapter searchParams={{ account: 'sa-1' }} hasMemory>
				<ServiceAccountDrawer onSuccess={jest.fn()} />
			</NuqsTestingAdapter>,
		);

		const deleteBtn = await screen.findByTestId('sa-delete-btn');
		await waitFor(() =>
			expect(deleteBtn).toHaveAttribute(
				'data-denied-permissions',
				buildSADeletePermission('sa-1'),
			),
		);
		expect(deleteBtn).toHaveAttribute('aria-disabled', 'true');
	});
});
