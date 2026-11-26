import { QueryClient, QueryClientProvider } from 'react-query';
import ROUTES from 'constants/routes';
import { customRoleResponse } from 'mocks-server/__mockdata__/roles';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	act,
	render,
	screen,
	userEvent,
	waitFor,
	within,
} from 'tests/test-utils';
import {
	AUTHZ_CHECK_URL,
	authzMockResponse,
	setupAuthzAdmin,
} from 'lib/authz/utils/authz-test-utils';
import { getCurrentLocation } from 'lib/router/navigation';

import CreateEditRolePage from '../CreateEditRolePage';

jest.mock('@monaco-editor/react', () => ({
	__esModule: true,
	default: ({
		value,
		onChange,
	}: {
		value: string;
		onChange: (next?: string) => void;
	}): JSX.Element => (
		<textarea
			data-testid="monaco-editor"
			value={value}
			onChange={(e): void => onChange(e.target.value)}
		/>
	),
}));

const CUSTOM_ROLE_ID = '019c24aa-3333-0001-aaaa-111111111111';
const rolesApiBase = '*/api/v1/roles';
const VIEW_ROLE_URL = `${ROUTES.ROLE_DETAILS.replace(
	':roleId',
	CUSTOM_ROLE_ID,
)}?name=${encodeURIComponent('Custom Role')}`;

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
	server.use(
		setupAuthzAdmin(),
		rest.get(`${rolesApiBase}/:id`, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(roleWithTransactionGroups)),
		),
	);
});

afterEach(() => {
	server.resetHandlers();
});

function renderEditPage(roleId = CUSTOM_ROLE_ID): ReturnType<typeof render> {
	return render(<CreateEditRolePage />, undefined, {
		initialRoute: `/settings/roles/${roleId}/edit?name=Custom%20Role`,
	});
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

			expect(screen.getByTestId('role-editor-loading')).toBeInTheDocument();
		});

		it('shows loading title in header while fetching role data', async () => {
			server.use(
				rest.get(`${rolesApiBase}/:id`, (_req, res, ctx) =>
					res(ctx.delay(200), ctx.status(200), ctx.json(roleWithTransactionGroups)),
				),
			);

			renderEditPage();

			await expect(
				screen.findByText('Role - Loading role...'),
			).resolves.toBeInTheDocument();
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

			await expect(
				screen.findByTestId('role-load-error-banner'),
			).resolves.toBeInTheDocument();
		});

		it('shows failed to load title on load error', async () => {
			server.use(
				rest.get(`${rolesApiBase}/:id`, (_req, res, ctx) =>
					res(ctx.status(404), ctx.json({ error: { message: 'Not found' } })),
				),
			);

			renderEditPage();

			await expect(
				screen.findByText('Role - Failed to load role'),
			).resolves.toBeInTheDocument();
		});

		it('shows back button on load error', async () => {
			server.use(
				rest.get(`${rolesApiBase}/:id`, (_req, res, ctx) =>
					res(ctx.status(500), ctx.json({ error: { message: 'Server error' } })),
				),
			);

			renderEditPage();

			await expect(
				screen.findByTestId('cancel-button'),
			).resolves.toBeInTheDocument();
		});

		it('navigates to view page when cancel clicked in error state', async () => {
			const user = userEvent.setup();

			server.use(
				rest.get(`${rolesApiBase}/:id`, (_req, res, ctx) =>
					res(ctx.status(500), ctx.json({ error: { message: 'Server error' } })),
				),
			);

			renderEditPage();

			const cancelButton = await screen.findByTestId('cancel-button');
			await user.click(cancelButton);

			await waitFor(() => {
				const { pathname, search } = getCurrentLocation();
				expect(`${pathname}${search}`).toBe(VIEW_ROLE_URL);
			});
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
				expect(
					screen.queryByTestId('role-name-input-field'),
				).not.toBeInTheDocument();
			});
		});

		it('populates description input with existing value', async () => {
			renderEditPage();

			await waitFor(async () => {
				const descInput = await screen.findByTestId('role-description-input-field');
				expect(descInput).toHaveValue(
					'Custom role for managing billing and invoices.',
				);
			});
		});

		it('description input is enabled in edit mode', async () => {
			renderEditPage();

			const descInput = await screen.findByTestId('role-description-input-field');
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
				const descInput = await screen.findByTestId('role-description-input-field');
				expect(descInput).toHaveValue(
					'Custom role for managing billing and invoices.',
				);
			});

			const saveBtn = screen.getByTestId('save-button');
			expect(saveBtn).toHaveAttribute('aria-disabled', 'true');
		});
	});

	describe('form interactions', () => {
		it('enables save button when description is modified', async () => {
			const user = userEvent.setup();
			renderEditPage();

			const descInput = await screen.findByTestId('role-description-input-field');
			await user.clear(descInput);
			await user.type(descInput, 'New description');

			const saveBtn = screen.getByTestId('save-button');
			expect(saveBtn).not.toHaveAttribute('aria-disabled', 'true');
		});

		it('shows unsaved indicator when description modified', async () => {
			const user = userEvent.setup();
			renderEditPage();

			const descInput = await screen.findByTestId('role-description-input-field');
			await user.type(descInput, ' updated');

			await expect(
				screen.findByText('Unsaved changes'),
			).resolves.toBeInTheDocument();
		});

		it('disables save when changes reverted to original', async () => {
			const user = userEvent.setup();
			renderEditPage();

			const descInput = await screen.findByTestId('role-description-input-field');
			const originalValue = 'Custom role for managing billing and invoices.';

			await user.clear(descInput);
			await user.type(descInput, 'Temporary change');
			expect(screen.getByTestId('save-button')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);

			await user.clear(descInput);
			await user.type(descInput, originalValue);

			await waitFor(() => {
				expect(screen.getByTestId('save-button')).toHaveAttribute(
					'aria-disabled',
					'true',
				);
			});
		});
	});

	describe('cancel action', () => {
		it('navigates to view role page on cancel', async () => {
			const user = userEvent.setup();
			renderEditPage();

			await screen.findByTestId('role-description-input-field');

			const cancelBtn = screen.getByTestId('cancel-button');
			await user.click(cancelBtn);

			await waitFor(() => {
				const { pathname, search } = getCurrentLocation();
				expect(`${pathname}${search}`).toBe(VIEW_ROLE_URL);
			});
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

			const descInput = await screen.findByTestId('role-description-input-field');
			await user.clear(descInput);
			await user.type(descInput, 'Updated description');

			const saveBtn = screen.getByTestId('save-button');
			await user.click(saveBtn);

			await waitFor(() => {
				const { pathname, search } = getCurrentLocation();
				expect(`${pathname}${search}`).toBe(VIEW_ROLE_URL);
			});
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

			const descInput = await screen.findByTestId('role-description-input-field');
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

			const descInput = await screen.findByTestId('role-description-input-field');
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

			const descInput = await screen.findByTestId('role-description-input-field');
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

			const descInput = await screen.findByTestId('role-description-input-field');
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
			expect(screen.getByTestId('save-button')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});
	});

	describe('JSON view opened from the URL', () => {
		const roleGrants = roleWithTransactionGroups.data.transactionGroups;

		function renderJsonView(client?: QueryClient): ReturnType<typeof render> {
			const page = <CreateEditRolePage />;
			return render(
				client ? (
					<QueryClientProvider client={client}>{page}</QueryClientProvider>
				) : (
					page
				),
				undefined,
				{
					initialRoute: `/settings/roles/${CUSTOM_ROLE_ID}/edit?name=Custom%20Role&viewMode=json`,
				},
			);
		}

		function readBuffer(editor: HTMLElement): unknown {
			return JSON.parse((editor as HTMLTextAreaElement).value);
		}

		it('shows the role grants when the role loads after the authz check', async () => {
			server.use(
				rest.get(`${rolesApiBase}/:id`, (_req, res, ctx) =>
					res(ctx.delay(300), ctx.status(200), ctx.json(roleWithTransactionGroups)),
				),
			);

			renderJsonView();

			const editor = await screen.findByTestId('monaco-editor');
			expect(readBuffer(editor)).toStrictEqual(roleGrants);
		});

		it('shows the role grants when the role loads before the authz check', async () => {
			server.use(
				rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
					const payload = await req.json();
					return res(
						ctx.delay(300),
						ctx.status(200),
						ctx.json(
							authzMockResponse(
								payload,
								payload.map(() => true),
							),
						),
					);
				}),
			);

			renderJsonView();

			const editor = await screen.findByTestId('monaco-editor');
			expect(readBuffer(editor)).toStrictEqual(roleGrants);
		});

		it('saves what was typed in the buffer even when the role refetches afterwards', async () => {
			const updatedBodies: unknown[] = [];
			let roleReads = 0;
			server.use(
				rest.get(`${rolesApiBase}/:id`, (_req, res, ctx) => {
					roleReads += 1;
					return res(
						ctx.status(200),
						ctx.json(
							roleReads === 1
								? roleWithTransactionGroups
								: {
										...roleWithTransactionGroups,
										data: {
											...roleWithTransactionGroups.data,
											transactionGroups: [
												{
													objectGroup: {
														resource: { kind: 'role', type: 'role' },
														selectors: ['*'],
													},
													relation: 'update',
												},
											],
										},
									},
						),
					);
				}),
				rest.put(`${rolesApiBase}/:id`, async (req, res, ctx) => {
					updatedBodies.push(await req.json());
					return res(ctx.status(200), ctx.json({ status: 'success' }));
				}),
			);

			const user = userEvent.setup();
			const client = new QueryClient({
				defaultOptions: { queries: { retry: false } },
			});
			renderJsonView(client);

			const editor = await screen.findByTestId('monaco-editor');
			await user.type(editor, '[[]', {
				initialSelectionStart: 0,
				initialSelectionEnd: (editor as HTMLTextAreaElement).value.length,
			});

			await act(async () => {
				await client.invalidateQueries();
			});
			await waitFor(() => {
				expect(roleReads).toBeGreaterThan(1);
			});

			await user.click(screen.getByTestId('save-button'));

			await waitFor(() => {
				expect(updatedBodies).toHaveLength(1);
			});
			expect(updatedBodies[0]).toMatchObject({ transactionGroups: [] });
		});
	});
});
