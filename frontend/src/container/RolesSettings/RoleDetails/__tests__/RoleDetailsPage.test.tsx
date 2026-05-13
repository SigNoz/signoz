jest.mock('../../config', () => ({ IS_ROLE_DETAILS_AND_CRUD_ENABLED: true }));

import {
	customRoleResponse,
	managedRoleResponse,
} from 'mocks-server/__mockdata__/roles';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';

import RoleDetailsPage from '../RoleDetailsPage';

const CUSTOM_ROLE_ID = '019c24aa-3333-0001-aaaa-111111111111';
const MANAGED_ROLE_ID = '019c24aa-2248-756f-9833-984f1ab63819';

const rolesApiBase = 'http://localhost/api/v1/roles';

const emptyObjectsResponse = { status: 'success', data: [] };

const allScopeObjectsResponse = {
	status: 'success',
	data: [
		{
			resource: { kind: 'role', type: 'metaresources' },
			selectors: ['*'],
		},
	],
};

function setupDefaultHandlers(roleId = CUSTOM_ROLE_ID): void {
	const roleResponse =
		roleId === MANAGED_ROLE_ID ? managedRoleResponse : customRoleResponse;

	server.use(
		rest.get(`${rolesApiBase}/:id`, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(roleResponse)),
		),
	);
}

afterEach(() => {
	jest.clearAllMocks();
	server.resetHandlers();
});

describe('RoleDetailsPage', () => {
	it('renders custom role header, tabs, description, permissions, and action buttons', async () => {
		setupDefaultHandlers();

		render(<RoleDetailsPage />, undefined, {
			initialRoute: `/settings/roles/${CUSTOM_ROLE_ID}`,
		});

		await expect(
			screen.findByText('Role — billing-manager'),
		).resolves.toBeInTheDocument();

		expect(screen.getByText('Overview')).toBeInTheDocument();
		expect(screen.getByText('Members')).toBeInTheDocument();

		expect(
			screen.getByText('Custom role for managing billing and invoices.'),
		).toBeInTheDocument();

		expect(screen.getByText('Create')).toBeInTheDocument();
		expect(screen.getByText('Read')).toBeInTheDocument();

		expect(
			screen.getByRole('button', { name: /edit role details/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /delete role/i }),
		).toBeInTheDocument();
	});

	it('shows managed-role warning callout and hides edit/delete buttons', async () => {
		setupDefaultHandlers(MANAGED_ROLE_ID);

		render(<RoleDetailsPage />, undefined, {
			initialRoute: `/settings/roles/${MANAGED_ROLE_ID}`,
		});

		await expect(
			screen.findByText(/Role — signoz-admin/),
		).resolves.toBeInTheDocument();

		expect(
			screen.getByText(
				'This is a managed role. Permissions and settings are view-only and cannot be modified.',
			),
		).toBeInTheDocument();

		expect(screen.queryByText('Edit Role Details')).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /delete role/i }),
		).not.toBeInTheDocument();
	});

	it('edit flow: modal opens pre-filled and calls PATCH on save', async () => {
		const patchSpy = jest.fn();
		let description = customRoleResponse.data.description;
		server.use(
			rest.get(`${rolesApiBase}/:id`, (_req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						...customRoleResponse,
						data: { ...customRoleResponse.data, description },
					}),
				),
			),
			rest.patch(`${rolesApiBase}/:id`, async (req, res, ctx) => {
				const body = await req.json();
				patchSpy(body);
				description = body.description;
				return res(
					ctx.status(200),
					ctx.json({
						...customRoleResponse,
						data: { ...customRoleResponse.data, description },
					}),
				);
			}),
		);

		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<RoleDetailsPage />, undefined, {
			initialRoute: `/settings/roles/${CUSTOM_ROLE_ID}`,
		});

		await screen.findByText('Role — billing-manager');

		await user.click(screen.getByRole('button', { name: /edit role details/i }));
		await expect(
			screen.findByText('Edit Role Details', { selector: '.ant-modal-title' }),
		).resolves.toBeInTheDocument();

		const nameInput = screen.getByPlaceholderText(
			'Enter role name e.g. : Service Owner',
		);
		expect(nameInput).toBeDisabled();

		const descField = screen.getByPlaceholderText(
			'A helpful description of the role',
		);
		await user.clear(descField);
		await user.type(descField, 'Updated description');
		await user.click(screen.getByRole('button', { name: /save changes/i }));

		await waitFor(() =>
			expect(patchSpy).toHaveBeenCalledWith({
				description: 'Updated description',
			}),
		);

		await waitFor(() =>
			expect(
				screen.queryByText('Edit Role Details', { selector: '.ant-modal-title' }),
			).not.toBeInTheDocument(),
		);

		await expect(
			screen.findByText('Updated description'),
		).resolves.toBeInTheDocument();
	});

	it('delete flow: modal shows role name, DELETE called on confirm', async () => {
		const deleteSpy = jest.fn();

		setupDefaultHandlers();
		server.use(
			rest.delete(`${rolesApiBase}/:id`, (_req, res, ctx) => {
				deleteSpy();
				return res(ctx.status(200), ctx.json({ status: 'success' }));
			}),
		);

		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<RoleDetailsPage />, undefined, {
			initialRoute: `/settings/roles/${CUSTOM_ROLE_ID}`,
		});

		await screen.findByText('Role — billing-manager');

		await user.click(screen.getByRole('button', { name: /delete role/i }));

		await expect(
			screen.findByText(/Are you sure you want to delete the role/),
		).resolves.toBeInTheDocument();

		const dialog = await screen.findByRole('dialog');
		await user.click(
			within(dialog).getByRole('button', { name: /delete role/i }),
		);

		await waitFor(() => expect(deleteSpy).toHaveBeenCalled());

		await waitFor(() =>
			expect(
				screen.queryByText(/Are you sure you want to delete the role/),
			).not.toBeInTheDocument(),
		);
	});

	describe('permission side panel', () => {
		// Callers must register GET .../relations/:relation/objects before rendering.
		async function openCreatePanel(
			user: ReturnType<typeof userEvent.setup>,
		): Promise<void> {
			await screen.findByText('Role — billing-manager');
			await user.click(screen.getByText('Create'));
			await screen.findByText('Edit Create Permissions');
			await screen.findByRole('button', { name: 'Role' });
		}

		it('Save Changes is disabled until a resource scope is changed', async () => {
			setupDefaultHandlers();
			server.use(
				rest.get(
					`${rolesApiBase}/:id/relations/:relation/objects`,
					(_req, res, ctx) => res(ctx.status(200), ctx.json(emptyObjectsResponse)),
				),
			);

			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<RoleDetailsPage />, undefined, {
				initialRoute: `/settings/roles/${CUSTOM_ROLE_ID}`,
			});

			await openCreatePanel(user);

			expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();

			await user.click(screen.getByRole('button', { name: 'Role' }));
			await user.click(screen.getByText('All'));

			expect(
				screen.getByRole('button', { name: /save changes/i }),
			).not.toBeDisabled();
			expect(screen.getByText('1 unsaved change')).toBeInTheDocument();
		});

		it('set scope to All → patchObjects additions: ["*"], deletions: null', async () => {
			const patchSpy = jest.fn();

			setupDefaultHandlers();
			server.use(
				rest.get(
					`${rolesApiBase}/:id/relations/:relation/objects`,
					(_req, res, ctx) => res(ctx.status(200), ctx.json(emptyObjectsResponse)),
				),
				rest.patch(
					`${rolesApiBase}/:id/relations/:relation/objects`,
					async (req, res, ctx) => {
						patchSpy(await req.json());
						return res(ctx.status(200), ctx.json({ status: 'success', data: null }));
					},
				),
			);

			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<RoleDetailsPage />, undefined, {
				initialRoute: `/settings/roles/${CUSTOM_ROLE_ID}`,
			});

			await openCreatePanel(user);

			await user.click(screen.getByRole('button', { name: 'Role' }));
			await user.click(screen.getByText('All'));
			await user.click(screen.getByRole('button', { name: /save changes/i }));

			await waitFor(() =>
				expect(patchSpy).toHaveBeenCalledWith({
					additions: [
						{
							resource: { kind: 'role', type: 'metaresources' },
							selectors: ['*'],
						},
					],
					deletions: null,
				}),
			);
		});

		it('set scope to Only selected with IDs → patchObjects additions contain those IDs', async () => {
			const patchSpy = jest.fn();

			setupDefaultHandlers();
			server.use(
				rest.get(
					`${rolesApiBase}/:id/relations/:relation/objects`,
					(_req, res, ctx) => res(ctx.status(200), ctx.json(emptyObjectsResponse)),
				),
				rest.patch(
					`${rolesApiBase}/:id/relations/:relation/objects`,
					async (req, res, ctx) => {
						patchSpy(await req.json());
						return res(ctx.status(200), ctx.json({ status: 'success', data: null }));
					},
				),
			);

			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<RoleDetailsPage />, undefined, {
				initialRoute: `/settings/roles/${CUSTOM_ROLE_ID}`,
			});

			await openCreatePanel(user);

			await user.click(screen.getByRole('button', { name: 'Role' }));

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);
			await user.type(combobox, 'role-001');
			await user.keyboard('{Enter}');

			await user.click(screen.getByRole('button', { name: /save changes/i }));

			await waitFor(() =>
				expect(patchSpy).toHaveBeenCalledWith({
					additions: [
						{
							resource: { kind: 'role', type: 'metaresources' },
							selectors: ['role-001'],
						},
					],
					deletions: null,
				}),
			);
		});

		it('existing All scope changed to Only selected (empty) → patchObjects deletions: ["*"], additions: null', async () => {
			const patchSpy = jest.fn();

			setupDefaultHandlers();
			server.use(
				rest.get(
					`${rolesApiBase}/:id/relations/:relation/objects`,
					(_req, res, ctx) =>
						res(ctx.status(200), ctx.json(allScopeObjectsResponse)),
				),
				rest.patch(
					`${rolesApiBase}/:id/relations/:relation/objects`,
					async (req, res, ctx) => {
						patchSpy(await req.json());
						return res(ctx.status(200), ctx.json({ status: 'success', data: null }));
					},
				),
			);

			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<RoleDetailsPage />, undefined, {
				initialRoute: `/settings/roles/${CUSTOM_ROLE_ID}`,
			});

			await openCreatePanel(user);

			await user.click(screen.getByRole('button', { name: 'Role' }));
			await user.click(screen.getByText('Only selected'));
			await user.click(screen.getByRole('button', { name: /save changes/i }));

			await waitFor(() =>
				expect(patchSpy).toHaveBeenCalledWith({
					additions: null,
					deletions: [
						{
							resource: { kind: 'role', type: 'metaresources' },
							selectors: ['*'],
						},
					],
				}),
			);
		});

		it('unsaved changes counter shown on scope change, Discard resets it', async () => {
			setupDefaultHandlers();
			server.use(
				rest.get(
					`${rolesApiBase}/:id/relations/:relation/objects`,
					(_req, res, ctx) => res(ctx.status(200), ctx.json(emptyObjectsResponse)),
				),
			);

			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<RoleDetailsPage />, undefined, {
				initialRoute: `/settings/roles/${CUSTOM_ROLE_ID}`,
			});

			await openCreatePanel(user);

			expect(screen.queryByText(/unsaved change/)).not.toBeInTheDocument();

			await user.click(screen.getByRole('button', { name: 'Role' }));
			await user.click(screen.getByText('All'));

			expect(screen.getByText('1 unsaved change')).toBeInTheDocument();

			await user.click(screen.getByRole('button', { name: /discard/i }));

			expect(screen.queryByText(/unsaved change/)).not.toBeInTheDocument();
			expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
		});
	});
});
