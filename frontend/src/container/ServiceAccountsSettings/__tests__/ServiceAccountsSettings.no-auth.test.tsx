import { listRolesSuccessResponse } from 'mocks-server/__mockdata__/roles';
import { rest, server } from 'mocks-server/server';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { setupAuthzAdmin } from 'tests/authz-test-utils';
import { renderWithNoAuth } from 'tests/no-auth-test-utils';
import { screen } from 'tests/test-utils';

import ServiceAccountsSettings from '../ServiceAccountsSettings';

const SA_LIST_ENDPOINT = '*/api/v1/service_accounts';
const SA_ENDPOINT = '*/api/v1/service_accounts/:id';
const SA_KEYS_ENDPOINT = '*/api/v1/service_accounts/:id/keys';
const SA_ROLES_ENDPOINT = '*/api/v1/service_accounts/:id/roles';
const ROLES_ENDPOINT = '*/api/v1/roles';

const mockServiceAccountsAPI = [
	{
		id: 'sa-1',
		name: 'CI Bot',
		email: 'ci-bot@signoz.io',
		roles: ['signoz-admin'],
		status: 'ACTIVE',
		createdAt: 1700000000,
		updatedAt: 1700000001,
	},
];

describe('ServiceAccountsSettings — no-auth mode', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		server.use(
			setupAuthzAdmin(),
			rest.get(SA_LIST_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: mockServiceAccountsAPI })),
			),
			rest.get(SA_ENDPOINT, (req, res, ctx) => {
				const { id } = req.params as { id: string };
				const account = mockServiceAccountsAPI.find((a) => a.id === id);
				return account
					? res(ctx.status(200), ctx.json({ data: account }))
					: res(ctx.status(404), ctx.json({ message: 'Not found' }));
			}),
			rest.get(SA_KEYS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: [] })),
			),
			rest.get(SA_ROLES_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: [] })),
			),
			rest.get(ROLES_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(listRolesSuccessResponse)),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders the no-auth sentinel for the New Service Account button', async () => {
		renderWithNoAuth(
			<NuqsTestingAdapter>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		await screen.findByText('CI Bot');

		expect(screen.getByTestId('no-auth-new-service-account')).toBeInTheDocument();
	});
});
