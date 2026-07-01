import { Route, Switch } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';
import { useAuthZ } from 'hooks/useAuthZ/useAuthZ';
import { mockUseAuthZGrantAll } from 'tests/authz-test-utils';

import CreateEditRolePage from '../CreateEditRolePage';

jest.mock('hooks/useAuthZ/useAuthZ');
const mockUseAuthZ = useAuthZ as jest.MockedFunction<typeof useAuthZ>;

const rolesApiBase = '*/api/v1/roles';

beforeEach(() => {
	mockUseAuthZ.mockImplementation(mockUseAuthZGrantAll);
});

afterEach(() => {
	jest.clearAllMocks();
	server.resetHandlers();
});

function renderCreatePage(): ReturnType<typeof render> {
	return render(
		<Switch>
			<Route path={ROUTES.ROLES_SETTINGS} exact>
				<div data-testid="roles-list-redirect" />
			</Route>
			<Route path={ROUTES.ROLE_CREATE}>
				<CreateEditRolePage />
			</Route>
		</Switch>,
		undefined,
		{ initialRoute: '/settings/roles/new' },
	);
}

describe('CreateRolePage', () => {
	describe('initial render', () => {
		it('renders create role page with testId', () => {
			renderCreatePage();

			expect(screen.getByTestId('create-edit-role-page')).toBeInTheDocument();
		});

		it('shows breadcrumb with "Create role" as current page', () => {
			renderCreatePage();

			const page = screen.getByTestId('create-edit-role-page');
			const breadcrumbs = within(page).getAllByText('Create role');
			expect(breadcrumbs.length).toBeGreaterThanOrEqual(1);
		});

		it('renders empty name input', () => {
			renderCreatePage();

			const nameInput = screen.getByTestId('role-name-input');
			expect(nameInput).toHaveValue('');
		});

		it('renders empty description input', () => {
			renderCreatePage();

			const descInput = screen.getByTestId('role-description-input');
			expect(descInput).toHaveValue('');
		});

		it('name input is enabled in create mode', () => {
			renderCreatePage();

			const nameInput = screen.getByTestId('role-name-input');
			expect(nameInput).not.toBeDisabled();
		});

		it('save button shows "Create role" text', () => {
			renderCreatePage();

			const saveBtn = screen.getByTestId('save-button');
			expect(saveBtn).toHaveTextContent('Create role');
		});

		it('save button is disabled when no changes', () => {
			renderCreatePage();

			const saveBtn = screen.getByTestId('save-button');
			expect(saveBtn).toBeDisabled();
		});

		it('does not show unsaved indicator initially', () => {
			renderCreatePage();

			expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
		});
	});

	describe('form interactions', () => {
		it('enables save button when name is entered', async () => {
			const user = userEvent.setup();
			renderCreatePage();

			const nameInput = screen.getByTestId('role-name-input');
			await user.type(nameInput, 'test-role');

			const saveBtn = screen.getByTestId('save-button');
			expect(saveBtn).not.toBeDisabled();
		});

		it('shows unsaved indicator when form modified', async () => {
			const user = userEvent.setup();
			renderCreatePage();

			const nameInput = screen.getByTestId('role-name-input');
			await user.type(nameInput, 'my-role');

			await expect(
				screen.findByText('Unsaved changes'),
			).resolves.toBeInTheDocument();
		});

		it('enables save button when description is entered', async () => {
			const user = userEvent.setup();
			renderCreatePage();

			const descInput = screen.getByTestId('role-description-input');
			await user.type(descInput, 'Some description');

			const saveBtn = screen.getByTestId('save-button');
			expect(saveBtn).not.toBeDisabled();
		});
	});

	describe('cancel action', () => {
		it('navigates to roles list on cancel', async () => {
			const user = userEvent.setup();
			renderCreatePage();

			const cancelBtn = screen.getByTestId('cancel-button');
			await user.click(cancelBtn);

			await expect(
				screen.findByTestId('roles-list-redirect'),
			).resolves.toBeInTheDocument();
		});
	});

	describe('create success flow', () => {
		it('calls create API with form data and redirects', async () => {
			const createSpy = jest.fn();

			server.use(
				rest.post(rolesApiBase, async (req, res, ctx) => {
					createSpy(await req.json());
					return res(
						ctx.status(200),
						ctx.json({
							status: 'success',
							data: { id: 'new-role-id', name: 'my-custom-role' },
						}),
					);
				}),
			);

			const user = userEvent.setup();
			renderCreatePage();

			const nameInput = screen.getByTestId('role-name-input');
			await user.type(nameInput, 'my-custom-role');

			const descInput = screen.getByTestId('role-description-input');
			await user.type(descInput, 'Role for testing');

			const saveBtn = screen.getByTestId('save-button');
			await user.click(saveBtn);

			await waitFor(() => {
				expect(createSpy).toHaveBeenCalledWith(
					expect.objectContaining({
						name: 'my-custom-role',
						description: 'Role for testing',
					}),
				);
			});

			await expect(
				screen.findByTestId('roles-list-redirect'),
			).resolves.toBeInTheDocument();
		});
	});

	describe('create error flows', () => {
		it('does not call API when name is empty', async () => {
			const createSpy = jest.fn();
			server.use(
				rest.post(rolesApiBase, async (req, res, ctx) => {
					createSpy();
					return res(ctx.status(200), ctx.json({ status: 'success' }));
				}),
			);

			const user = userEvent.setup();
			renderCreatePage();

			const descInput = screen.getByTestId('role-description-input');
			await user.type(descInput, 'Description only');

			const saveBtn = screen.getByTestId('save-button');
			await user.click(saveBtn);

			await waitFor(
				() => {
					expect(createSpy).not.toHaveBeenCalled();
				},
				{ timeout: 500 },
			);
		});

		it('shows error banner with "Role name is required" when saving with empty name', async () => {
			const user = userEvent.setup();
			renderCreatePage();

			const descInput = screen.getByTestId('role-description-input');
			await user.type(descInput, 'Description only');

			const saveBtn = screen.getByTestId('save-button');
			await user.click(saveBtn);

			await expect(
				screen.findByTestId('save-error-banner'),
			).resolves.toBeInTheDocument();

			await expect(
				screen.findByText('Role name is required'),
			).resolves.toBeInTheDocument();
		});

		it('clears error banner when user starts typing in name field', async () => {
			const user = userEvent.setup();
			renderCreatePage();

			const descInput = screen.getByTestId('role-description-input');
			await user.type(descInput, 'Description only');

			const saveBtn = screen.getByTestId('save-button');
			await user.click(saveBtn);

			await expect(
				screen.findByTestId('save-error-banner'),
			).resolves.toBeInTheDocument();

			const nameInput = screen.getByTestId('role-name-input');
			await user.type(nameInput, 'a');

			await waitFor(() => {
				expect(screen.queryByTestId('save-error-banner')).not.toBeInTheDocument();
			});
		});

		it('shows error banner when API fails', async () => {
			server.use(
				rest.post(rolesApiBase, (_req, res, ctx) =>
					res(
						ctx.status(400),
						ctx.json({
							error: { message: 'Role name already exists' },
						}),
					),
				),
			);

			const user = userEvent.setup();
			renderCreatePage();

			const nameInput = screen.getByTestId('role-name-input');
			await user.type(nameInput, 'duplicate-role');

			const saveBtn = screen.getByTestId('save-button');
			await user.click(saveBtn);

			await expect(
				screen.findByTestId('save-error-banner'),
			).resolves.toBeInTheDocument();

			await expect(
				screen.findByText('Role name already exists'),
			).resolves.toBeInTheDocument();
		});
	});

	describe('validation errors', () => {
		it('shows validation error when Only Selected has no items', async () => {
			const user = userEvent.setup();
			renderCreatePage();

			const nameInput = screen.getByTestId('role-name-input');
			await user.type(nameInput, 'valid-role');

			const apiKeysCard = screen.getByTestId('resource-card-factor-api-key');
			const header = within(apiKeysCard).getByTestId(
				'resource-card-header-factor-api-key',
			);
			await user.click(header);

			const readToggle = within(apiKeysCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);
			const onlySelectedBtn = await within(readToggle).findByText('Only selected');
			await user.click(onlySelectedBtn);

			const saveBtn = screen.getByTestId('save-button');
			await user.click(saveBtn);

			await expect(
				screen.findByTestId('save-error-banner'),
			).resolves.toBeInTheDocument();

			await expect(
				screen.findByText(
					'Please add at least one selector for each "Only selected" permission.',
				),
			).resolves.toBeInTheDocument();
		});
	});
});
