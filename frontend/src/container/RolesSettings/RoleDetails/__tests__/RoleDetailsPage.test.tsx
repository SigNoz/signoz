import * as roleApi from 'api/generated/services/role';
import {
	customRoleResponse,
	managedRoleResponse,
} from 'mocks-server/__mockdata__/roles';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
	within,
} from 'tests/test-utils';
import { useAuthZ } from 'hooks/useAuthZ/useAuthZ';
import {
	mockUseAuthZDenyAll,
	mockUseAuthZGrantAll,
} from 'tests/authz-test-utils';
import RoleDetailsPage from '../RoleDetailsPage';

jest.mock('hooks/useAuthZ/useAuthZ');
const mockUseAuthZ = useAuthZ as jest.MockedFunction<typeof useAuthZ>;

const CUSTOM_ROLE_ID = '019c24aa-3333-0001-aaaa-111111111111';
const MANAGED_ROLE_ID = '019c24aa-2248-756f-9833-984f1ab63819';

const rolesApiBase = 'http://localhost/api/v1/roles';

const emptyObjectsResponse = { status: 'success', data: [] };

const allScopeObjectsResponse = {
	status: 'success',
	data: [
		{
			resource: { kind: 'role', type: 'role' },
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

beforeEach(() => {
	mockUseAuthZ.mockImplementation(mockUseAuthZGrantAll);
});

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

	it('shows PermissionDeniedFullPage when read permission is denied via query param', async () => {
		mockUseAuthZ.mockImplementation(mockUseAuthZDenyAll);

		render(<RoleDetailsPage />, undefined, {
			initialRoute: `/settings/roles/${CUSTOM_ROLE_ID}?name=billing-manager`,
		});

		await expect(
			screen.findByText(/you don't have permission to view this page/i),
		).resolves.toBeInTheDocument();
	});

	describe('permission side panel', () => {
		beforeEach(() => {
			// Both hooks mocked so data renders synchronously — no React Query scheduler or MSW round-trip.
			jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
				data: customRoleResponse,
				isLoading: false,
				isFetching: false,
				isError: false,
				error: null,
			} as any);
			jest
				.spyOn(roleApi, 'useGetObjects')
				.mockReturnValue({ data: emptyObjectsResponse, isLoading: false } as any);
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		async function openCreatePanel(): Promise<HTMLElement> {
			await screen.findByText('Role — billing-manager');
			fireEvent.click(screen.getByText('Create'));
			await screen.findByText('Edit Create Permissions');
			const panel = document.querySelector(
				'.permission-side-panel',
			) as HTMLElement;
			await within(panel).findByRole('button', { name: 'role' });
			return panel;
		}

		async function openReadPanel(): Promise<HTMLElement> {
			await screen.findByText('Role — billing-manager');
			fireEvent.click(screen.getByText('Read'));
			await screen.findByText('Edit Read Permissions');
			const panel = document.querySelector(
				'.permission-side-panel',
			) as HTMLElement;
			await within(panel).findByRole('button', { name: 'role' });
			return panel;
		}

		it('Save Changes is disabled until a resource scope is changed', async () => {
			render(<RoleDetailsPage />, undefined, {
				initialRoute: `/settings/roles/${CUSTOM_ROLE_ID}`,
			});

			const panel = await openCreatePanel();

			expect(
				within(panel).getByRole('button', { name: /save changes/i }),
			).toBeDisabled();

			fireEvent.click(within(panel).getByRole('button', { name: 'role' }));
			fireEvent.click(screen.getByText('All'));

			expect(
				within(panel).getByRole('button', { name: /save changes/i }),
			).not.toBeDisabled();
			expect(screen.getByText('1 unsaved change')).toBeInTheDocument();
		});

		it('set scope to All → patchObjects additions: ["*"], deletions: null', async () => {
			const patchSpy = jest.fn();

			server.use(
				rest.patch(
					`${rolesApiBase}/:id/relations/:relation/objects`,
					async (req, res, ctx) => {
						patchSpy(await req.json());
						return res(ctx.status(200), ctx.json({ status: 'success', data: null }));
					},
				),
			);

			render(<RoleDetailsPage />, undefined, {
				initialRoute: `/settings/roles/${CUSTOM_ROLE_ID}`,
			});

			const panel = await openCreatePanel();

			fireEvent.click(within(panel).getByRole('button', { name: 'role' }));
			fireEvent.click(screen.getByText('All'));
			fireEvent.click(
				within(panel).getByRole('button', { name: /save changes/i }),
			);

			await waitFor(() =>
				expect(patchSpy).toHaveBeenCalledWith({
					additions: [
						{
							resource: { kind: 'role', type: 'role' },
							selectors: ['*'],
						},
					],
					deletions: null,
				}),
			);
		});

		it('set scope to Only selected with IDs → patchObjects additions contain those IDs', async () => {
			const patchSpy = jest.fn();

			server.use(
				rest.patch(
					`${rolesApiBase}/:id/relations/:relation/objects`,
					async (req, res, ctx) => {
						patchSpy(await req.json());
						return res(ctx.status(200), ctx.json({ status: 'success', data: null }));
					},
				),
			);

			render(<RoleDetailsPage />, undefined, {
				initialRoute: `/settings/roles/${CUSTOM_ROLE_ID}`,
			});

			const panel = await openReadPanel();

			fireEvent.click(within(panel).getByRole('button', { name: 'role' }));
			// Default is NONE, so switch to Only selected first to reveal the combobox
			fireEvent.click(screen.getByText('Only selected'));

			const combobox = within(panel).getByRole('combobox');
			fireEvent.change(combobox, { target: { value: 'role-001' } });
			fireEvent.keyDown(combobox, { key: 'Enter', keyCode: 13 });

			fireEvent.click(
				within(panel).getByRole('button', { name: /save changes/i }),
			);

			await waitFor(() =>
				expect(patchSpy).toHaveBeenCalledWith({
					additions: [
						{
							resource: { kind: 'role', type: 'role' },
							selectors: ['role-001'],
						},
					],
					deletions: null,
				}),
			);
		});

		it('set scope to None on create panel (existing All) → patchObjects deletions: ["*"], additions: null', async () => {
			const patchSpy = jest.fn();

			jest.spyOn(roleApi, 'useGetObjects').mockReturnValue({
				data: allScopeObjectsResponse,
				isLoading: false,
			} as any);
			server.use(
				rest.patch(
					`${rolesApiBase}/:id/relations/:relation/objects`,
					async (req, res, ctx) => {
						patchSpy(await req.json());
						return res(ctx.status(200), ctx.json({ status: 'success', data: null }));
					},
				),
			);

			render(<RoleDetailsPage />, undefined, {
				initialRoute: `/settings/roles/${CUSTOM_ROLE_ID}`,
			});

			const panel = await openCreatePanel();

			fireEvent.click(within(panel).getByRole('button', { name: 'role' }));
			fireEvent.click(screen.getByText('None'));
			fireEvent.click(
				within(panel).getByRole('button', { name: /save changes/i }),
			);

			await waitFor(() =>
				expect(patchSpy).toHaveBeenCalledWith({
					additions: null,
					deletions: [
						{
							resource: { kind: 'role', type: 'role' },
							selectors: ['*'],
						},
					],
				}),
			);
		});

		it('existing All scope changed to Only selected (empty) → patchObjects deletions: ["*"], additions: null', async () => {
			const patchSpy = jest.fn();

			jest.spyOn(roleApi, 'useGetObjects').mockReturnValue({
				data: allScopeObjectsResponse,
				isLoading: false,
			} as any);
			server.use(
				rest.patch(
					`${rolesApiBase}/:id/relations/:relation/objects`,
					async (req, res, ctx) => {
						patchSpy(await req.json());
						return res(ctx.status(200), ctx.json({ status: 'success', data: null }));
					},
				),
			);

			render(<RoleDetailsPage />, undefined, {
				initialRoute: `/settings/roles/${CUSTOM_ROLE_ID}`,
			});

			const panel = await openReadPanel();

			fireEvent.click(within(panel).getByRole('button', { name: 'role' }));
			fireEvent.click(screen.getByText('Only selected'));
			fireEvent.click(
				within(panel).getByRole('button', { name: /save changes/i }),
			);

			await waitFor(() =>
				expect(patchSpy).toHaveBeenCalledWith({
					additions: null,
					deletions: [
						{
							resource: { kind: 'role', type: 'role' },
							selectors: ['*'],
						},
					],
				}),
			);
		});

		it('unsaved changes counter shown on scope change, Discard resets it', async () => {
			render(<RoleDetailsPage />, undefined, {
				initialRoute: `/settings/roles/${CUSTOM_ROLE_ID}`,
			});

			const panel = await openCreatePanel();

			expect(screen.queryByText(/unsaved change/)).not.toBeInTheDocument();

			fireEvent.click(within(panel).getByRole('button', { name: 'role' }));
			fireEvent.click(screen.getByText('All'));

			expect(screen.getByText('1 unsaved change')).toBeInTheDocument();

			fireEvent.click(within(panel).getByRole('button', { name: /discard/i }));

			expect(screen.queryByText(/unsaved change/)).not.toBeInTheDocument();
			expect(
				within(panel).getByRole('button', { name: /save changes/i }),
			).toBeDisabled();
		});
	});
});
