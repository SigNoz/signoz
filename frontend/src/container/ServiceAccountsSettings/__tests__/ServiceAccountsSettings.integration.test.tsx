import type { ReactNode } from 'react';
import { listRolesSuccessResponse } from 'mocks-server/__mockdata__/roles';
import { rest, server } from 'mocks-server/server';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { fireEvent, render, screen, waitFor } from 'tests/test-utils';
import { setupAuthzAdmin } from 'tests/authz-test-utils';

import ServiceAccountsSettings from '../ServiceAccountsSettings';

const SA_LIST_ENDPOINT = '*/api/v1/service_accounts';
const SA_ENDPOINT = '*/api/v1/service_accounts/:id';
const SA_KEYS_ENDPOINT = '*/api/v1/service_accounts/:id/keys';
const SA_ROLES_ENDPOINT = '*/api/v1/service_accounts/:id/roles';
const ROLES_ENDPOINT = '*/api/v1/roles';

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

jest.mock('@signozhq/ui/dialog', () => ({
	...jest.requireActual('@signozhq/ui/dialog'),
	DialogWrapper: ({
		children,
		open,
		title,
	}: {
		children?: ReactNode;
		open: boolean;
		title?: string;
	}): JSX.Element | null =>
		open ? (
			<div role="dialog" aria-label={title}>
				{children}
			</div>
		) : null,
	DialogFooter: ({ children }: { children?: ReactNode }): JSX.Element => (
		<div>{children}</div>
	),
}));

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
	{
		id: 'sa-2',
		name: 'Monitoring Agent',
		email: 'monitor@signoz.io',
		roles: ['signoz-viewer'],
		status: 'ACTIVE',
		createdAt: 1700000002,
		updatedAt: 1700000003,
	},
	{
		id: 'sa-3',
		name: 'Legacy Bot',
		email: 'legacy@signoz.io',
		roles: ['signoz-editor'],
		status: 'DISABLED',
		createdAt: 1700000004,
		updatedAt: 1700000005,
	},
];

describe('ServiceAccountsSettings (integration)', () => {
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

	it('loads and displays all accounts with correct ACTIVE and DISABLED badges', async () => {
		render(
			<NuqsTestingAdapter>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		await screen.findByText('CI Bot');
		expect(screen.getByText('Monitoring Agent')).toBeInTheDocument();
		expect(screen.getByText('legacy@signoz.io')).toBeInTheDocument();
		expect(screen.getAllByText('ACTIVE')).toHaveLength(2);
		expect(screen.getByText('DISABLED')).toBeInTheDocument();
	});

	it('filter dropdown to "Active" hides DISABLED accounts', async () => {
		render(
			<NuqsTestingAdapter>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		await screen.findByText('CI Bot');

		fireEvent.click(screen.getByRole('button', { name: /All accounts/i }));

		const activeOption = await screen.findByText(/Active ⎯/i);
		fireEvent.click(activeOption);

		await screen.findByText('CI Bot');
		expect(screen.queryByText('Legacy Bot')).not.toBeInTheDocument();
	});

	it('search by name filters accounts in real-time', async () => {
		render(
			<NuqsTestingAdapter>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		await screen.findByText('CI Bot');

		fireEvent.change(screen.getByPlaceholderText(/Search by name or email/i), {
			target: { value: 'legacy' },
		});

		await screen.findByText('Legacy Bot');
		expect(screen.queryByText('CI Bot')).not.toBeInTheDocument();
		expect(screen.queryByText('Monitoring Agent')).not.toBeInTheDocument();
	});

	it('clicking a row opens the drawer with account details visible', async () => {
		render(
			<NuqsTestingAdapter hasMemory>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		fireEvent.click(
			await screen.findByRole('button', {
				name: /View service account CI Bot/i,
			}),
		);

		await expect(
			screen.findByRole('button', { name: /Delete Service Account/i }),
		).resolves.toBeInTheDocument();
	});

	it('saving changes in the drawer refetches the list', async () => {
		const listRefetchSpy = jest.fn();
		const putSpy = jest.fn();

		server.use(
			rest.get(SA_LIST_ENDPOINT, (_, res, ctx) => {
				listRefetchSpy();
				return res(ctx.status(200), ctx.json({ data: mockServiceAccountsAPI }));
			}),
			rest.put(SA_ENDPOINT, async (req, res, ctx) => {
				putSpy(await req.json());
				return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
			}),
		);

		render(
			<NuqsTestingAdapter hasMemory>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		await screen.findByText('CI Bot');
		listRefetchSpy.mockClear();

		fireEvent.click(
			await screen.findByRole('button', { name: /View service account CI Bot/i }),
		);

		const nameInput = await screen.findByDisplayValue('CI Bot');
		fireEvent.change(nameInput, { target: { value: 'CI Bot Updated' } });

		await screen.findByDisplayValue('CI Bot Updated');

		fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

		// Wait for the PUT to complete with the right payload — confirms save fired
		await waitFor(() =>
			expect(putSpy).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'CI Bot Updated' }),
			),
		);

		await waitFor(() => {
			expect(listRefetchSpy).toHaveBeenCalled();
		});
	});

	it('"New Service Account" button opens the Create Service Account modal', async () => {
		render(
			<NuqsTestingAdapter hasMemory>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		await screen.findByText('CI Bot');

		// Wait for authz check to resolve before clicking
		await waitFor(() =>
			expect(
				screen.getByRole('button', { name: /New Service Account/i }),
			).not.toBeDisabled(),
		);

		fireEvent.click(screen.getByRole('button', { name: /New Service Account/i }));

		await screen.findByRole('dialog', { name: /New Service Account/i });
		expect(screen.getByPlaceholderText('Enter a name')).toBeInTheDocument();
	});

	it('shows error state when API fails', async () => {
		server.use(
			rest.get(SA_LIST_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(500), ctx.json({ message: 'Internal Server Error' })),
			),
		);

		render(
			<NuqsTestingAdapter>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		await expect(
			screen.findByText(
				/An unexpected error occurred while fetching service accounts/i,
			),
		).resolves.toBeInTheDocument();
	});
});
