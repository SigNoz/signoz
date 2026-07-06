import { Route, Switch } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { customRoleResponse } from 'mocks-server/__mockdata__/roles';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { mockUseAuthZGrantAll } from 'lib/authz/utils/authz-test-utils';

import CreateEditRolePage from '../CreateEditRolePage';

jest.mock('lib/authz/hooks/useAuthZ/useAuthZ');
const mockUseAuthZ = useAuthZ as jest.MockedFunction<typeof useAuthZ>;

const CUSTOM_ROLE_ID = '019c24aa-3333-0001-aaaa-111111111111';
const rolesApiBase = '*/api/v1/roles';

const roleWithTransactionGroups = {
	status: 'success',
	data: {
		...customRoleResponse.data,
		transactionGroups: [
			{
				objectGroup: {
					resource: { kind: 'role', type: 'role' },
					selectors: ['*'],
				},
				relation: 'read',
			},
		],
	},
};

beforeEach(() => {
	mockUseAuthZ.mockImplementation(mockUseAuthZGrantAll);
	server.use(
		rest.get(`${rolesApiBase}/:id`, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(roleWithTransactionGroups)),
		),
	);
});

afterEach(() => {
	jest.clearAllMocks();
	server.resetHandlers();
});

function renderEditPage(roleId = CUSTOM_ROLE_ID): ReturnType<typeof render> {
	return render(
		<Switch>
			<Route path={ROUTES.ROLES_SETTINGS} exact>
				<div data-testid="roles-list-redirect" />
			</Route>
			<Route path={ROUTES.ROLE_DETAILS} exact>
				<div data-testid="role-details-redirect" />
			</Route>
			<Route path={ROUTES.ROLE_EDIT}>
				<CreateEditRolePage />
			</Route>
		</Switch>,
		undefined,
		{ initialRoute: `/settings/roles/${roleId}/edit?name=Custom%20Role` },
	);
}

describe('EditRolePage', () => {
	describe('loading state', () => {
		it('shows skeleton while fetching role data', () => {
			server.use(
				rest.get(`${rolesApiBase}/:id`, (_req, res, ctx) =>
					res(ctx.delay(200), ctx.status(200), ctx.json(roleWithTransactionGroups)),
				),
			);

			renderEditPage();

			expect(document.querySelector('.ant-skeleton')).toBeInTheDocument();
		});
	});

	describe('load error state', () => {
		it('shows error banner when role load fails', async () => {
			server.use(
				rest.get(`${rolesApiBase}/:id`, (_req, res, ctx) =>
					res(ctx.status(500), ctx.json({ error: { message: 'Server error' } })),
				),
			);

			renderEditPage();

			await waitFor(() => {
				expect(document.querySelector('.error-in-place')).toBeInTheDocument();
			});
		});

		it('shows Failed to load role title on load error', async () => {
			server.use(
				rest.get(`${rolesApiBase}/:id`, (_req, res, ctx) =>
					res(ctx.status(404), ctx.json({ error: { message: 'Not found' } })),
				),
			);

			renderEditPage();

			await expect(
				screen.findByText('Failed to load role'),
			).resolves.toBeInTheDocument();
		});

		it('shows back button on load error', async () => {
			server.use(
				rest.get(`${rolesApiBase}/:id`, (_req, res, ctx) =>
					res(ctx.status(500), ctx.json({ error: { message: 'Server error' } })),
				),
			);

			renderEditPage();

			await waitFor(() => {
				expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
			});
		});

		it('navigates to view page when cancel clicked in error state', async () => {
			const user = userEvent.setup();

			server.use(
				rest.get(`${rolesApiBase}/:id`, (_req, res, ctx) =>
					res(ctx.status(500), ctx.json({ error: { message: 'Server error' } })),
				),
			);

			renderEditPage();

			await waitFor(async () => {
				const cancelButton = await screen.findByTestId('cancel-button');
				await user.click(cancelButton);
			});

			await expect(
				screen.findByTestId('role-details-redirect'),
			).resolves.toBeInTheDocument();
		});
	});

	describe('initial render with loaded data', () => {
		it('shows role name in page title', async () => {
			renderEditPage();

			await expect(
				screen.findByText('Role - billing-manager'),
			).resolves.toBeInTheDocument();
		});

		it('name input is not shown in edit mode', async () => {
			renderEditPage();

			await waitFor(() => {
				expect(screen.queryByTestId('role-name-input')).not.toBeInTheDocument();
			});
		});

		it('populates description input with existing value', async () => {
			renderEditPage();

			await waitFor(async () => {
				const descInput = await screen.findByTestId('role-description-input');
				expect(descInput).toHaveValue(
					'Custom role for managing billing and invoices.',
				);
			});
		});

		it('description input is enabled in edit mode', async () => {
			renderEditPage();

			const descInput = await screen.findByTestId('role-description-input');
			expect(descInput).not.toBeDisabled();
		});

		it('save button shows "Save changes" text', async () => {
			renderEditPage();

			const saveBtn = await screen.findByTestId('save-button');
			expect(saveBtn).toHaveTextContent('Save changes');
		});

		it('save button is disabled when no unsaved changes', async () => {
			renderEditPage();

			await waitFor(async () => {
				const descInput = await screen.findByTestId('role-description-input');
				expect(descInput).toHaveValue(
					'Custom role for managing billing and invoices.',
				);
			});

			const saveBtn = screen.getByTestId('save-button');
			expect(saveBtn).toBeDisabled();
		});
	});

	describe('form interactions', () => {
		it('enables save button when description is modified', async () => {
			const user = userEvent.setup();
			renderEditPage();

			const descInput = await screen.findByTestId('role-description-input');
			await user.clear(descInput);
			await user.type(descInput, 'New description');

			const saveBtn = screen.getByTestId('save-button');
			expect(saveBtn).not.toBeDisabled();
		});

		it('shows unsaved indicator when description modified', async () => {
			const user = userEvent.setup();
			renderEditPage();

			const descInput = await screen.findByTestId('role-description-input');
			await user.type(descInput, ' updated');

			await expect(
				screen.findByText('Unsaved changes'),
			).resolves.toBeInTheDocument();
		});

		it('disables save when changes reverted to original', async () => {
			const user = userEvent.setup();
			renderEditPage();

			const descInput = await screen.findByTestId('role-description-input');
			const originalValue = 'Custom role for managing billing and invoices.';

			await user.clear(descInput);
			await user.type(descInput, 'Temporary change');
			expect(screen.getByTestId('save-button')).not.toBeDisabled();

			await user.clear(descInput);
			await user.type(descInput, originalValue);

			await waitFor(() => {
				expect(screen.getByTestId('save-button')).toBeDisabled();
			});
		});
	});

	describe('cancel action', () => {
		it('navigates to view role page on cancel', async () => {
			const user = userEvent.setup();
			renderEditPage();

			await screen.findByTestId('role-description-input');

			const cancelBtn = screen.getByTestId('cancel-button');
			await user.click(cancelBtn);

			await expect(
				screen.findByTestId('role-details-redirect'),
			).resolves.toBeInTheDocument();
		});
	});

	describe('update success flow', () => {
		it('redirects to view page after successful update', async () => {
			server.use(
				rest.put(`${rolesApiBase}/:id`, (_req, res, ctx) =>
					res(ctx.status(200), ctx.json({ status: 'success' })),
				),
			);

			const user = userEvent.setup();
			renderEditPage();

			const descInput = await screen.findByTestId('role-description-input');
			await user.clear(descInput);
			await user.type(descInput, 'Updated description');

			const saveBtn = screen.getByTestId('save-button');
			await user.click(saveBtn);

			await expect(
				screen.findByTestId('role-details-redirect'),
			).resolves.toBeInTheDocument();
		});

		it('calls update API when save clicked', async () => {
			const updateSpy = jest.fn();

			server.use(
				rest.put(`${rolesApiBase}/:id`, async (req, res, ctx) => {
					updateSpy();
					return res(ctx.status(200), ctx.json({ status: 'success' }));
				}),
			);

			const user = userEvent.setup();
			renderEditPage();

			const descInput = await screen.findByTestId('role-description-input');
			await user.type(descInput, ' edited');

			const saveBtn = screen.getByTestId('save-button');
			await user.click(saveBtn);

			await waitFor(() => {
				expect(updateSpy).toHaveBeenCalled();
			});
		});
	});

	describe('update error flow', () => {
		it('shows error banner when update fails with 500', async () => {
			server.use(
				rest.put(`${rolesApiBase}/:id`, (_req, res, ctx) => res(ctx.status(500))),
			);

			const user = userEvent.setup();
			renderEditPage();

			const descInput = await screen.findByTestId('role-description-input');
			await user.type(descInput, ' changed');

			const saveBtn = screen.getByTestId('save-button');
			await user.click(saveBtn);

			await expect(
				screen.findByTestId('save-error-banner'),
			).resolves.toBeInTheDocument();
		});

		it('shows error banner when update fails with 403', async () => {
			server.use(
				rest.put(`${rolesApiBase}/:id`, (_req, res, ctx) => res(ctx.status(403))),
			);

			const user = userEvent.setup();
			renderEditPage();

			const descInput = await screen.findByTestId('role-description-input');
			await user.type(descInput, ' test');

			const saveBtn = screen.getByTestId('save-button');
			await user.click(saveBtn);

			await expect(
				screen.findByTestId('save-error-banner'),
			).resolves.toBeInTheDocument();
		});

		it('shows error banner when update fails with 400', async () => {
			server.use(
				rest.put(`${rolesApiBase}/:id`, (_req, res, ctx) => res(ctx.status(400))),
			);

			const user = userEvent.setup();
			renderEditPage();

			const descInput = await screen.findByTestId('role-description-input');
			await user.type(descInput, ' x');

			const saveBtn = screen.getByTestId('save-button');
			await user.click(saveBtn);

			await expect(
				screen.findByTestId('save-error-banner'),
			).resolves.toBeInTheDocument();
		});
	});

	describe('permission changes', () => {
		it('detects permission change as unsaved', async () => {
			const user = userEvent.setup();
			renderEditPage();

			await screen.findByTestId('permission-editor');

			const apiKeysCard = await screen.findByTestId(
				'resource-card-factor-api-key',
			);
			const header = within(apiKeysCard).getByTestId(
				'resource-card-header-factor-api-key',
			);
			await user.click(header);

			const createToggle = within(apiKeysCard).getByTestId(
				'action-toggle-factor-api-key-create',
			);
			const allBtn = await within(createToggle).findByText('All');
			await user.click(allBtn);

			await expect(
				screen.findByText('Unsaved changes'),
			).resolves.toBeInTheDocument();
			expect(screen.getByTestId('save-button')).not.toBeDisabled();
		});
	});
});
