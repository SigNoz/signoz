import type { ReactNode } from 'react';
import { ServiceAccountRow } from 'container/ServiceAccountsSettings/utils';
import { listRolesSuccessResponse } from 'mocks-server/__mockdata__/roles';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import ServiceAccountDrawer, {
	ServiceAccountDrawerProps,
} from '../ServiceAccountDrawer';

jest.mock('@signozhq/drawer', () => ({
	DrawerWrapper: ({
		content,
		open,
	}: {
		content?: ReactNode;
		open: boolean;
	}): JSX.Element | null => (open ? <div>{content}</div> : null),
}));

jest.mock('@signozhq/sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

const ROLES_ENDPOINT = '*/api/v1/roles';
const SA_KEYS_ENDPOINT = '*/api/v1/service_accounts/:id/keys';
const SA_UPDATE_ENDPOINT = '*/api/v1/service_accounts/sa-1';
const SA_STATUS_ENDPOINT = '*/api/v1/service_accounts/sa-1/status';

const activeAccount: ServiceAccountRow = {
	id: 'sa-1',
	name: 'CI Bot',
	email: 'ci-bot@signoz.io',
	roles: ['signoz-admin'],
	status: 'ACTIVE',
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-02T00:00:00Z',
};

const disabledAccount: ServiceAccountRow = {
	...activeAccount,
	id: 'sa-2',
	status: 'DISABLED',
};

function renderDrawer(
	props: Partial<ServiceAccountDrawerProps> = {},
): ReturnType<typeof render> {
	return render(
		<ServiceAccountDrawer
			account={activeAccount}
			onSuccess={jest.fn()}
			{...props}
		/>,
	);
}

describe('ServiceAccountDrawer', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		server.use(
			rest.get(ROLES_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(listRolesSuccessResponse)),
			),
			rest.get(SA_KEYS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: [] })),
			),
			rest.put(SA_UPDATE_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success', data: {} })),
			),
			rest.put(SA_STATUS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success', data: {} })),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders Overview tab by default: editable name input, locked email, Save disabled when not dirty', () => {
		renderDrawer();

		expect(screen.getByDisplayValue('CI Bot')).toBeInTheDocument();
		expect(screen.getByText('ci-bot@signoz.io')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
	});

	it('editing name enables Save; clicking Save sends correct payload and calls onSuccess', async () => {
		const onSuccess = jest.fn();
		const updateSpy = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		server.use(
			rest.put(SA_UPDATE_ENDPOINT, async (req, res, ctx) => {
				updateSpy(await req.json());
				return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
			}),
		);

		renderDrawer({ onSuccess });

		const nameInput = screen.getByDisplayValue('CI Bot');
		await user.clear(nameInput);
		await user.type(nameInput, 'CI Bot Updated');

		const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
		await waitFor(() => expect(saveBtn).not.toBeDisabled());
		await user.click(saveBtn);

		await waitFor(() => {
			expect(updateSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'CI Bot Updated',
					email: 'ci-bot@signoz.io',
					roles: ['signoz-admin'],
				}),
			);
			expect(onSuccess).toHaveBeenCalledWith({ closeDrawer: false });
		});
	});

	it('changing roles enables Save; clicking Save sends updated roles in payload', async () => {
		const updateSpy = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		server.use(
			rest.put(SA_UPDATE_ENDPOINT, async (req, res, ctx) => {
				updateSpy(await req.json());
				return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
			}),
		);

		renderDrawer();

		await user.click(screen.getByLabelText('Roles'));
		await user.click(await screen.findByTitle('signoz-viewer'));

		const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
		await waitFor(() => expect(saveBtn).not.toBeDisabled());
		await user.click(saveBtn);

		await waitFor(() => {
			expect(updateSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					roles: expect.arrayContaining(['signoz-admin', 'signoz-viewer']),
				}),
			);
		});
	});

	it('"Disable Service Account" opens confirm dialog; confirming sends correct status and calls onSuccess', async () => {
		const onSuccess = jest.fn();
		const statusSpy = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		server.use(
			rest.put(SA_STATUS_ENDPOINT, async (req, res, ctx) => {
				statusSpy(await req.json());
				return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
			}),
		);

		renderDrawer({ onSuccess });

		await user.click(
			screen.getByRole('button', { name: /Disable Service Account/i }),
		);

		const dialog = await screen.findByRole('dialog', {
			name: /Disable service account CI Bot/i,
		});
		expect(dialog).toBeInTheDocument();

		const confirmBtns = screen.getAllByRole('button', { name: /^Disable$/i });
		await user.click(confirmBtns[confirmBtns.length - 1]);

		await waitFor(() => {
			expect(statusSpy).toHaveBeenCalledWith({ status: 'DISABLED' });
			expect(onSuccess).toHaveBeenCalledWith({ closeDrawer: true });
		});
	});

	it('disabled account shows read-only name, no Save button, no Disable button', () => {
		renderDrawer({ account: disabledAccount });

		expect(
			screen.queryByRole('button', { name: /Save Changes/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /Disable Service Account/i }),
		).not.toBeInTheDocument();
		expect(screen.queryByDisplayValue('CI Bot')).not.toBeInTheDocument();
		expect(screen.getByText('CI Bot')).toBeInTheDocument();
	});

	it('switching to Keys tab shows "No keys" empty state', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderDrawer();

		await user.click(screen.getByRole('radio', { name: /Keys/i }));

		await screen.findByText(/No keys/i);
	});
});
