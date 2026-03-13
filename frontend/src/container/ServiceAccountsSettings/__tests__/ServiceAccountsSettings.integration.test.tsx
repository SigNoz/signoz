import type { ReactNode } from 'react';
import { listRolesSuccessResponse } from 'mocks-server/__mockdata__/roles';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent } from 'tests/test-utils';

import ServiceAccountsSettings from '../ServiceAccountsSettings';

const SA_LIST_ENDPOINT = '*/api/v1/service_accounts';
const SA_KEYS_ENDPOINT = '*/api/v1/service_accounts/:id/keys';
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

jest.mock('@signozhq/toggle-group', () => ({
	ToggleGroup: ({
		children,
		className,
	}: {
		children: ReactNode;
		onValueChange?: (val: string) => void;
		value?: string;
		type?: string;
		className?: string;
	}): JSX.Element => <div className={className}>{children}</div>,
	ToggleGroupItem: ({
		children,
		className,
	}: {
		children: ReactNode;
		value: string;
		className?: string;
	}): JSX.Element => <span className={className}>{children}</span>,
}));

jest.mock('@signozhq/drawer', () => ({
	DrawerWrapper: ({
		content,
		open,
	}: {
		content?: ReactNode;
		open: boolean;
	}): JSX.Element | null => (open ? <div>{content}</div> : null),
}));

jest.mock('@signozhq/dialog', () => ({
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

jest.mock('@signozhq/sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

describe('ServiceAccountsSettings (integration)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		server.use(
			rest.get(SA_LIST_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: mockServiceAccountsAPI })),
			),
			rest.get(SA_KEYS_ENDPOINT, (_, res, ctx) =>
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
		render(<ServiceAccountsSettings />);

		await screen.findByText('CI Bot');
		expect(screen.getByText('Monitoring Agent')).toBeInTheDocument();
		expect(screen.getByText('legacy@signoz.io')).toBeInTheDocument();
		expect(screen.getAllByText('ACTIVE')).toHaveLength(2);
		expect(screen.getByText('DISABLED')).toBeInTheDocument();
	});

	it('filter dropdown to "Active" hides DISABLED accounts', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<ServiceAccountsSettings />);

		await screen.findByText('CI Bot');

		await user.click(screen.getByRole('button', { name: /All accounts/i }));

		const activeOption = await screen.findByText(/Active ⎯/i);
		await user.click(activeOption);

		await screen.findByText('CI Bot');
		expect(screen.queryByText('Legacy Bot')).not.toBeInTheDocument();
	});

	it('search by name filters accounts in real-time', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<ServiceAccountsSettings />);

		await screen.findByText('CI Bot');

		await user.type(
			screen.getByPlaceholderText(/Search by name or email/i),
			'legacy',
		);

		await screen.findByText('Legacy Bot');
		expect(screen.queryByText('CI Bot')).not.toBeInTheDocument();
		expect(screen.queryByText('Monitoring Agent')).not.toBeInTheDocument();
	});

	it('clicking a row opens the drawer with account details visible', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<ServiceAccountsSettings />);

		await user.click(
			await screen.findByRole('button', {
				name: /View service account CI Bot/i,
			}),
		);

		expect(
			await screen.findByRole('button', { name: /Disable Service Account/i }),
		).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
	});

	it('"New Service Account" button opens the Create Service Account modal', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<ServiceAccountsSettings />);

		await screen.findByText('CI Bot');

		await user.click(
			screen.getByRole('button', { name: /New Service Account/i }),
		);

		await screen.findByRole('dialog', { name: /New Service Account/i });
		expect(screen.getByPlaceholderText('Enter a name')).toBeInTheDocument();
	});
	it('shows error state when API fails', async () => {
		server.use(
			rest.get(SA_LIST_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(500), ctx.json({ message: 'Internal Server Error' })),
			),
		);

		render(<ServiceAccountsSettings />);

		expect(
			await screen.findByText(
				/An unexpected error occurred while fetching service accounts/i,
			),
		).toBeInTheDocument();
	});
});
