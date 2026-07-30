import { server } from 'mocks-server/server';
import { screen, userEvent, waitFor, within } from 'tests/test-utils';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';

import { expandResourceCard, renderCreateRolePage } from './testUtils';

jest.setTimeout(15_000);

beforeEach(() => {
	server.use(setupAuthzAdmin());
});

afterEach(() => {
	server.resetHandlers();
});

describe('PermissionEditor', () => {
	describe('mode toggle', () => {
		it('renders permission editor with testId', async () => {
			await renderCreateRolePage();

			expect(screen.getByTestId('permission-editor')).toBeInTheDocument();
		});

		it('defaults to interactive mode', async () => {
			await renderCreateRolePage();

			const interactiveRadio = screen.getByTestId(
				'permission-editor-mode-interactive',
			);
			expect(interactiveRadio).toBeChecked();
		});

		it('switches to JSON mode when clicked', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();

			const jsonRadio = screen.getByTestId('permission-editor-mode-json');
			await user.click(jsonRadio);

			expect(jsonRadio).toBeChecked();
			expect(screen.getByTestId('json-editor')).toBeInTheDocument();
		});

		it('switches back to interactive mode', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();

			const jsonRadio = screen.getByTestId('permission-editor-mode-json');
			await user.click(jsonRadio);

			const interactiveRadio = screen.getByTestId(
				'permission-editor-mode-interactive',
			);
			await user.click(interactiveRadio);

			expect(interactiveRadio).toBeChecked();
			expect(screen.queryByTestId('json-editor')).not.toBeInTheDocument();
		});
	});

	describe('resource cards', () => {
		it('renders all resource cards', async () => {
			await renderCreateRolePage();

			expect(
				screen.getByTestId('resource-card-factor-api-key'),
			).toBeInTheDocument();
			expect(screen.getByTestId('resource-card-role')).toBeInTheDocument();
			expect(
				screen.getByTestId('resource-card-serviceaccount'),
			).toBeInTheDocument();
		});

		it('resource cards are collapsed by default', async () => {
			await renderCreateRolePage();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const header = within(apiKeyCard).getByTestId(
				'resource-card-header-factor-api-key',
			);

			expect(header).toHaveAttribute('aria-expanded', 'false');
		});

		it('expands resource card when header clicked', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const header = within(apiKeyCard).getByTestId(
				'resource-card-header-factor-api-key',
			);

			await user.click(header);

			expect(header).toHaveAttribute('aria-expanded', 'true');
		});

		it('collapses expanded resource card when header clicked again', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const header = within(apiKeyCard).getByTestId(
				'resource-card-header-factor-api-key',
			);

			await user.click(header);
			await user.click(header);

			expect(header).toHaveAttribute('aria-expanded', 'false');
		});

		it('shows granted count in resource card header', async () => {
			await renderCreateRolePage();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			await expect(
				within(apiKeyCard).findByText(/0 \/ \d+ granted/),
			).resolves.toBeInTheDocument();
		});
	});

	describe('action toggles', () => {
		it('renders action toggles for each available action', async () => {
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			expect(
				within(apiKeyCard).getByTestId('action-toggle-factor-api-key-read'),
			).toBeInTheDocument();
			expect(
				within(apiKeyCard).getByTestId('action-toggle-factor-api-key-read'),
			).toBeInTheDocument();
			expect(
				within(apiKeyCard).getByTestId('action-toggle-factor-api-key-update'),
			).toBeInTheDocument();
			expect(
				within(apiKeyCard).getByTestId('action-toggle-factor-api-key-delete'),
			).toBeInTheDocument();
		});

		it('defaults all actions to None scope', async () => {
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			const scopeToggle = within(createToggle).getByTestId(
				'action-toggle-scope-factor-api-key-read',
			);
			expect(
				within(scopeToggle).getByRole('radio', { name: 'None' }),
			).toBeChecked();
		});

		it('changes scope to All when clicked', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			const allBtn = await within(createToggle).findByText('All');
			await user.click(allBtn);

			const scopeToggle = within(createToggle).getByTestId(
				'action-toggle-scope-factor-api-key-read',
			);
			expect(
				within(scopeToggle).getByRole('radio', { name: 'All' }),
			).toBeChecked();
		});

		it('updates granted count when scope changed', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(await within(createToggle).findByText('All'));

			await expect(
				within(apiKeyCard).findByText(/1 \/ \d+ granted/),
			).resolves.toBeInTheDocument();
		});
	});

	describe('Only Selected scope', () => {
		it('shows item input selector when Only Selected is chosen', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			const onlySelectedBtn =
				await within(createToggle).findByText('Only selected');
			await user.click(onlySelectedBtn);

			expect(
				screen.getByTestId('item-input-selector-factor-api-key-read'),
			).toBeInTheDocument();
		});

		it('adds item when typed and Enter pressed', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(await within(createToggle).findByText('Only selected'));

			const input = screen.getByTestId(
				'item-input-selector-input-factor-api-key-read',
			);
			await user.type(input, 'api-key-001{enter}');

			await expect(screen.findByText('api-key-001')).resolves.toBeInTheDocument();
		});

		it('adds item when Add button clicked', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(await within(createToggle).findByText('Only selected'));

			const input = screen.getByTestId(
				'item-input-selector-input-factor-api-key-read',
			);
			await user.type(input, 'api-key-002');

			const addBtn = screen.getByTestId(
				'item-input-selector-add-btn-factor-api-key-read',
			);
			await user.click(addBtn);

			await expect(screen.findByText('api-key-002')).resolves.toBeInTheDocument();
		});

		it('adds multiple items separated by comma', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(await within(createToggle).findByText('Only selected'));

			const input = screen.getByTestId(
				'item-input-selector-input-factor-api-key-read',
			);
			await user.type(input, 'key-a, key-b, key-c{enter}');

			await expect(screen.findByText('key-a')).resolves.toBeInTheDocument();
			await expect(screen.findByText('key-b')).resolves.toBeInTheDocument();
			await expect(screen.findByText('key-c')).resolves.toBeInTheDocument();
		});

		it('adds multiple items separated by space', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(await within(createToggle).findByText('Only selected'));

			const input = screen.getByTestId(
				'item-input-selector-input-factor-api-key-read',
			);
			await user.type(input, 'key-x key-y key-z{enter}');

			await expect(screen.findByText('key-x')).resolves.toBeInTheDocument();
			await expect(screen.findByText('key-y')).resolves.toBeInTheDocument();
			await expect(screen.findByText('key-z')).resolves.toBeInTheDocument();
		});

		it('does not add duplicate items', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(await within(createToggle).findByText('Only selected'));

			const input = screen.getByTestId(
				'item-input-selector-input-factor-api-key-read',
			);
			await user.type(input, 'same-key{enter}');
			await user.type(input, 'same-key{enter}');

			const badges = screen.getAllByText('same-key');
			expect(badges).toHaveLength(1);
		});

		it('removes item when X clicked', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(await within(createToggle).findByText('Only selected'));

			const input = screen.getByTestId(
				'item-input-selector-input-factor-api-key-read',
			);
			await user.type(input, 'removable-key{enter}');

			const badge = await screen.findByTestId('item-badge-factor-api-key-read-0');
			const removeBtn = within(badge).getByRole('button', {
				name: 'Remove removable-key',
			});
			await user.click(removeBtn);

			expect(screen.queryByText('removable-key')).not.toBeInTheDocument();
		});

		it('names each badge close button after the item it removes', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const readToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);
			await user.click(await within(readToggle).findByText('Only selected'));

			const input = screen.getByTestId(
				'item-input-selector-input-factor-api-key-read',
			);
			await user.type(input, 'key-one key-two{enter}');

			const firstBadge = await screen.findByTestId(
				'item-badge-factor-api-key-read-0',
			);
			const secondBadge = screen.getByTestId('item-badge-factor-api-key-read-1');

			expect(
				within(firstBadge).getByRole('button', { name: 'Remove key-one' }),
			).toBeInTheDocument();
			expect(
				within(secondBadge).getByRole('button', { name: 'Remove key-two' }),
			).toBeInTheDocument();
		});

		it('exposes the full item value as a title so truncated badges stay readable', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const readToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);
			await user.click(await within(readToggle).findByText('Only selected'));

			const input = screen.getByTestId(
				'item-input-selector-input-factor-api-key-read',
			);
			await user.type(input, 'a-very-long-api-key-identifier-000001{enter}');

			const badge = await screen.findByTestId('item-badge-factor-api-key-read-0');
			expect(
				within(badge).getByTitle('a-very-long-api-key-identifier-000001'),
			).toBeInTheDocument();
		});

		it('moves focus to the previous badge when closed with the keyboard', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const readToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);
			await user.click(await within(readToggle).findByText('Only selected'));

			const input = screen.getByTestId(
				'item-input-selector-input-factor-api-key-read',
			);
			await user.type(input, 'key-one key-two{enter}');

			const secondBadge = await screen.findByTestId(
				'item-badge-factor-api-key-read-1',
			);
			within(secondBadge).getByRole('button', { name: 'Remove key-two' }).focus();

			await user.keyboard('{Enter}');

			await waitFor(() => {
				const firstBadge = screen.getByTestId('item-badge-factor-api-key-read-0');
				expect(
					within(firstBadge).getByRole('button', { name: 'Remove key-one' }),
				).toHaveFocus();
			});
		});

		it('does not steal focus when a badge is closed with the mouse', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const readToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);
			await user.click(await within(readToggle).findByText('Only selected'));

			const input = screen.getByTestId(
				'item-input-selector-input-factor-api-key-read',
			);
			await user.type(input, 'key-one key-two{enter}');

			const secondBadge = await screen.findByTestId(
				'item-badge-factor-api-key-read-1',
			);
			await user.click(
				within(secondBadge).getByRole('button', { name: 'Remove key-two' }),
			);

			await waitFor(() => {
				expect(screen.queryByText('key-two')).not.toBeInTheDocument();
			});

			const firstBadge = screen.getByTestId('item-badge-factor-api-key-read-0');
			expect(
				within(firstBadge).getByRole('button', { name: 'Remove key-one' }),
			).not.toHaveFocus();
		});

		it('shows Add button disabled when input is empty', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(await within(createToggle).findByText('Only selected'));

			const addBtn = screen.getByTestId(
				'item-input-selector-add-btn-factor-api-key-read',
			);
			expect(addBtn).toBeDisabled();
		});
	});

	describe('scope change confirmation dialog', () => {
		it('shows confirm dialog when leaving Only Selected with items', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(await within(createToggle).findByText('Only selected'));

			const input = screen.getByTestId(
				'item-input-selector-input-factor-api-key-read',
			);
			await user.type(input, 'will-be-cleared{enter}');

			await user.click(await within(createToggle).findByText('All'));

			await expect(
				screen.findByText('Change permission scope?'),
			).resolves.toBeInTheDocument();
		});

		it('clears items when confirmed', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(await within(createToggle).findByText('Only selected'));

			const input = screen.getByTestId(
				'item-input-selector-input-factor-api-key-read',
			);
			await user.type(input, 'to-be-cleared{enter}');

			await user.click(await within(createToggle).findByText('All'));

			const dialog = await screen.findByRole('dialog');
			await user.click(
				within(dialog).getByRole('button', { name: /change scope/i }),
			);

			await waitFor(() => {
				expect(screen.queryByText('to-be-cleared')).not.toBeInTheDocument();
			});
		});

		it('keeps items when cancelled', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(await within(createToggle).findByText('Only selected'));

			const input = screen.getByTestId(
				'item-input-selector-input-factor-api-key-read',
			);
			await user.type(input, 'preserved-key{enter}');

			await user.click(await within(createToggle).findByText('None'));

			const dialog = await screen.findByRole('dialog');
			await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

			await expect(
				screen.findByText('preserved-key'),
			).resolves.toBeInTheDocument();

			expect(
				screen.getByTestId('item-input-selector-factor-api-key-read'),
			).toBeInTheDocument();
		});

		it('does not show dialog when leaving Only Selected with no items', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(await within(createToggle).findByText('Only selected'));
			await user.click(await within(createToggle).findByText('All'));

			expect(
				screen.queryByText('Change permission scope?'),
			).not.toBeInTheDocument();
		});
	});

	describe('verbs without Only Selected option', () => {
		it('does not show Only Selected for list verb', async () => {
			await renderCreateRolePage();
			await expandResourceCard('factor-api-key');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const listToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-list',
			);

			expect(
				within(listToggle).queryByText('Only selected'),
			).not.toBeInTheDocument();
			await expect(
				within(listToggle).findByText('None'),
			).resolves.toBeInTheDocument();
			await expect(
				within(listToggle).findByText('All'),
			).resolves.toBeInTheDocument();
		});
	});

	describe('collapse/expand all resources', () => {
		it('shows expand/collapse toggle group', async () => {
			await renderCreateRolePage();

			expect(screen.getByTestId('toggle-all-group')).toBeInTheDocument();
			expect(screen.getByTestId('expand-all-button')).toBeInTheDocument();
			expect(screen.getByTestId('collapse-all-button')).toBeInTheDocument();
		});

		it('expands all cards when expand button clicked', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();

			await user.click(screen.getByTestId('expand-all-button'));

			const headers = screen.getAllByTestId(/^resource-card-header-/);
			expect(headers.length).toBeGreaterThan(1);
			headers.forEach((header) => {
				expect(header).toHaveAttribute('aria-expanded', 'true');
			});
		});
	});

	describe('resource card error states', () => {
		it('shows error border on collapsed card with validation error', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();

			const nameInput = screen.getByTestId('role-name-input');
			await user.type(nameInput, 'valid-role');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const header = within(apiKeyCard).getByTestId(
				'resource-card-header-factor-api-key',
			);
			await user.click(header);

			const readToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);
			const onlySelectedBtn = await within(readToggle).findByText('Only selected');
			await user.click(onlySelectedBtn);

			await user.click(header);

			const saveBtn = screen.getByTestId('save-button');
			await user.click(saveBtn);

			await waitFor(() => {
				const card = screen.getByTestId('resource-card-factor-api-key');
				expect(card).toHaveAttribute('data-state', 'error');
			});
		});

		it('hides error border when card is expanded', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();

			const nameInput = screen.getByTestId('role-name-input');
			await user.type(nameInput, 'valid-role');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const header = within(apiKeyCard).getByTestId(
				'resource-card-header-factor-api-key',
			);
			await user.click(header);

			const readToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);
			const onlySelectedBtn = await within(readToggle).findByText('Only selected');
			await user.click(onlySelectedBtn);

			await user.click(header);

			const saveBtn = screen.getByTestId('save-button');
			await user.click(saveBtn);

			await waitFor(() => {
				const card = screen.getByTestId('resource-card-factor-api-key');
				expect(card).toHaveAttribute('data-state', 'error');
			});

			await user.click(header);

			await waitFor(() => {
				const card = screen.getByTestId('resource-card-factor-api-key');
				expect(card).not.toHaveAttribute('data-state');
			});
		});

		it('clears validation error when permission is changed', async () => {
			const user = userEvent.setup();
			await renderCreateRolePage();

			const nameInput = screen.getByTestId('role-name-input');
			await user.type(nameInput, 'valid-role');

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const header = within(apiKeyCard).getByTestId(
				'resource-card-header-factor-api-key',
			);
			await user.click(header);

			const readToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);
			const onlySelectedBtn = await within(readToggle).findByText('Only selected');
			await user.click(onlySelectedBtn);

			await user.click(header);

			const saveBtn = screen.getByTestId('save-button');
			await user.click(saveBtn);

			await expect(
				screen.findByTestId('save-error-banner'),
			).resolves.toBeInTheDocument();

			await user.click(header);

			const freshCard = screen.getByTestId('resource-card-factor-api-key');
			const freshToggle = within(freshCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);
			const noneBtn = await within(freshToggle).findByText('None');
			await user.click(noneBtn);

			await waitFor(() => {
				expect(screen.queryByTestId('save-error-banner')).not.toBeInTheDocument();
			});
		});
	});
});
