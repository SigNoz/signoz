import type { ReactNode } from 'react';
import { listRolesSuccessResponse } from 'mocks-server/__mockdata__/roles';
import { rest, server } from 'mocks-server/server';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import ServiceAccountDrawer from '../ServiceAccountDrawer';

jest.mock('@signozhq/drawer', () => ({
	DrawerWrapper: ({
		content,
		open,
	}: {
		content?: ReactNode;
		open: boolean;
	}): JSX.Element | null => (open ? <div>{content}</div> : null),
}));

jest.mock('@signozhq/ui', () => ({
	...jest.requireActual('@signozhq/ui'),
	toast: { success: jest.fn(), error: jest.fn() },
}));

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

const deletedAccountResponse = {
	...activeAccountResponse,
	id: 'sa-2',
	status: 'DELETED',
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
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders Overview tab by default: editable name input, locked email, Save disabled when not dirty', async () => {
		renderDrawer();

		expect(await screen.findByDisplayValue('CI Bot')).toBeInTheDocument();
		expect(screen.getByText('ci-bot@signoz.io')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
	});

	it('editing name enables Save; clicking Save sends correct payload and calls onSuccess', async () => {
		const onSuccess = jest.fn();
		const updateSpy = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		server.use(
			rest.put(SA_ENDPOINT, async (req, res, ctx) => {
				updateSpy(await req.json());
				return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
			}),
		);

		render(
			<NuqsTestingAdapter searchParams={{ account: 'sa-1' }} hasMemory>
				<ServiceAccountDrawer onSuccess={onSuccess} />
			</NuqsTestingAdapter>,
		);

		const nameInput = await screen.findByDisplayValue('CI Bot');
		await user.clear(nameInput);
		await user.type(nameInput, 'CI Bot Updated');

		const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
		await waitFor(() => expect(saveBtn).not.toBeDisabled());
		await user.click(saveBtn);

		await waitFor(() => {
			expect(updateSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'CI Bot Updated',
				}),
			);
			expect(onSuccess).toHaveBeenCalledWith({ closeDrawer: false });
		});
	});

	it('changing roles enables Save; clicking Save sends role add request without delete', async () => {
		const roleSpy = jest.fn();
		const deleteSpy = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		server.use(
			rest.post(SA_ROLES_ENDPOINT, async (req, res, ctx) => {
				roleSpy(await req.json());
				return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
			}),
			rest.delete(SA_ROLE_DELETE_ENDPOINT, (_, res, ctx) => {
				deleteSpy();
				return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
			}),
		);

		renderDrawer();

		await screen.findByDisplayValue('CI Bot');

		await user.click(screen.getByLabelText('Roles'));
		await user.click(await screen.findByTitle('signoz-viewer'));

		const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
		await waitFor(() => expect(saveBtn).not.toBeDisabled());
		await user.click(saveBtn);

		await waitFor(() => {
			expect(roleSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					id: '019c24aa-2248-7585-a129-4188b3473c27',
				}),
			);
			expect(deleteSpy).not.toHaveBeenCalled();
		});
	});

	it('"Delete Service Account" opens confirm dialog; confirming sends delete request', async () => {
		const deleteSpy = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		server.use(
			rest.delete(SA_DELETE_ENDPOINT, (_, res, ctx) => {
				deleteSpy();
				return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
			}),
		);

		renderDrawer();

		await screen.findByDisplayValue('CI Bot');

		await user.click(
			screen.getByRole('button', { name: /Delete Service Account/i }),
		);

		const dialog = await screen.findByRole('dialog', {
			name: /Delete service account CI Bot/i,
		});
		expect(dialog).toBeInTheDocument();

		const confirmBtns = screen.getAllByRole('button', { name: /^Delete$/i });
		await user.click(confirmBtns[confirmBtns.length - 1]);

		await waitFor(() => {
			expect(deleteSpy).toHaveBeenCalled();
		});

		await waitFor(() => {
			expect(screen.queryByDisplayValue('CI Bot')).not.toBeInTheDocument();
		});
	});

	it('deleted account shows read-only name, no Save button, no Delete button', async () => {
		server.use(
			rest.get('*/api/v1/service_accounts/sa-2', (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: deletedAccountResponse })),
			),
			rest.get('*/api/v1/service_accounts/sa-2/keys', (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: [] })),
			),
			rest.get('*/api/v1/service_accounts/sa-2/roles', (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: [] })),
			),
		);

		renderDrawer({ account: 'sa-2' });

		await screen.findByText('CI Bot');

		expect(
			screen.queryByRole('button', { name: /Save Changes/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /Delete Service Account/i }),
		).not.toBeInTheDocument();
		expect(screen.queryByDisplayValue('CI Bot')).not.toBeInTheDocument();
	});

	it('switching to Keys tab shows "No keys" empty state', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderDrawer();

		await screen.findByDisplayValue('CI Bot');

		await user.click(screen.getByRole('radio', { name: /Keys/i }));

		await screen.findByText(/No keys/i);
	});

	it('shows skeleton while loading account data', () => {
		renderDrawer();

		// Skeleton renders while the fetch is in-flight
		expect(document.querySelector('.ant-skeleton')).toBeInTheDocument();
	});

	it('shows error state when account fetch fails', async () => {
		server.use(
			rest.get(SA_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(500), ctx.json({ message: 'Server error' })),
			),
		);

		renderDrawer();

		expect(
			await screen.findByText(
				/An unexpected error occurred while fetching service account details/i,
			),
		).toBeInTheDocument();
	});
});

describe('ServiceAccountDrawer – save-error UX', () => {
	beforeEach(() => {
		jest.clearAllMocks();
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
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('name update failure shows SaveErrorItem with "Name update" context', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		server.use(
			rest.put(SA_ENDPOINT, (_, res, ctx) =>
				res(
					ctx.status(500),
					ctx.json({
						error: {
							code: 'INTERNAL_ERROR',
							message: 'name update failed',
						},
					}),
				),
			),
		);

		renderDrawer();

		const nameInput = await screen.findByDisplayValue('CI Bot');
		await user.clear(nameInput);
		await user.type(nameInput, 'New Name');

		const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
		await waitFor(() => expect(saveBtn).not.toBeDisabled());
		await user.click(saveBtn);

		expect(
			await screen.findByText(/Name update.*name update failed/i, undefined, {
				timeout: 5000,
			}),
		).toBeInTheDocument();
	});

	it('role add failure shows SaveErrorItem with the role name context', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		server.use(
			rest.post(SA_ROLES_ENDPOINT, (_, res, ctx) =>
				res(
					ctx.status(500),
					ctx.json({
						error: {
							code: 'INTERNAL_ERROR',
							message: 'role assign failed',
						},
					}),
				),
			),
		);

		renderDrawer();

		await screen.findByDisplayValue('CI Bot');

		// Add the signoz-viewer role (which is not currently assigned)
		await user.click(screen.getByLabelText('Roles'));
		await user.click(await screen.findByTitle('signoz-viewer'));

		const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
		await waitFor(() => expect(saveBtn).not.toBeDisabled());
		await user.click(saveBtn);

		expect(
			await screen.findByText(
				/Role 'signoz-viewer'.*role assign failed/i,
				undefined,
				{
					timeout: 5000,
				},
			),
		).toBeInTheDocument();
	});

	it('role add retries on 429 then succeeds without showing an error', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		let roleAddCallCount = 0;

		// First call → 429, second call → 200
		server.use(
			rest.post(SA_ROLES_ENDPOINT, (_, res, ctx) => {
				roleAddCallCount += 1;
				if (roleAddCallCount === 1) {
					return res(ctx.status(429), ctx.json({ message: 'Too Many Requests' }));
				}
				return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
			}),
		);

		renderDrawer();

		await screen.findByDisplayValue('CI Bot');

		await user.click(screen.getByLabelText('Roles'));
		await user.click(await screen.findByTitle('signoz-viewer'));

		const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
		await waitFor(() => expect(saveBtn).not.toBeDisabled());
		await user.click(saveBtn);

		// Retried after 429 — at least 2 calls, no error shown
		await waitFor(
			() => {
				expect(roleAddCallCount).toBeGreaterThanOrEqual(2);
			},
			{ timeout: 5000 },
		);
		expect(screen.queryByText(/role assign failed/i)).not.toBeInTheDocument();
	});

	it('clicking Retry on a name-update error re-triggers the request; on success the error item is removed', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		// First: PUT always fails so the error appears
		server.use(
			rest.put(SA_ENDPOINT, (_, res, ctx) =>
				res(
					ctx.status(500),
					ctx.json({
						error: {
							code: 'INTERNAL_ERROR',
							message: 'name update failed',
						},
					}),
				),
			),
		);

		renderDrawer();

		const nameInput = await screen.findByDisplayValue('CI Bot');
		await user.clear(nameInput);
		await user.type(nameInput, 'Retry Test');

		const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
		await waitFor(() => expect(saveBtn).not.toBeDisabled());
		await user.click(saveBtn);

		await screen.findByText(/Name update.*name update failed/i, undefined, {
			timeout: 5000,
		});

		server.use(
			rest.put(SA_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success', data: {} })),
			),
		);

		const retryBtn = screen.getByRole('button', { name: /Retry/i });
		await user.click(retryBtn);

		// Error item should be removed after successful retry
		await waitFor(() => {
			expect(
				screen.queryByText(/Name update.*name update failed/i),
			).not.toBeInTheDocument();
		});
	});
});
