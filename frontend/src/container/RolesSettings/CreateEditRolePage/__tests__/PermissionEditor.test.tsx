import { Route, Switch } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';
import { useAuthZ } from 'hooks/useAuthZ/useAuthZ';
import { mockUseAuthZGrantAll } from 'tests/authz-test-utils';
import { TooltipProvider } from '@signozhq/ui/tooltip';

import CreateEditRolePage from '../CreateEditRolePage';

jest.mock('hooks/useAuthZ/useAuthZ');
const mockUseAuthZ = useAuthZ as jest.MockedFunction<typeof useAuthZ>;

async function expandAllCards(): Promise<void> {
	const user = userEvent.setup();
	const expandButton = screen.getByTestId('expand-all-button');
	await user.click(expandButton);
}

beforeEach(() => {
	mockUseAuthZ.mockImplementation(mockUseAuthZGrantAll);
});

afterEach(() => {
	jest.clearAllMocks();
});

function renderPage(): ReturnType<typeof render> {
	return render(
		<TooltipProvider>
			<Switch>
				<Route path={ROUTES.ROLES_SETTINGS} exact>
					<div data-testid="roles-list-redirect" />
				</Route>
				<Route path={ROUTES.ROLE_CREATE}>
					<CreateEditRolePage />
				</Route>
			</Switch>
		</TooltipProvider>,
		undefined,
		{ initialRoute: '/settings/roles/new' },
	);
}

describe('PermissionEditor', () => {
	describe('mode toggle', () => {
		it('renders permission editor with testId', () => {
			renderPage();

			expect(screen.getByTestId('permission-editor')).toBeInTheDocument();
		});

		it('defaults to interactive mode', () => {
			renderPage();

			const interactiveRadio = screen.getByTestId(
				'permission-editor-mode-interactive',
			);
			expect(interactiveRadio).toBeChecked();
		});

		it('switches to JSON mode when clicked', async () => {
			const user = userEvent.setup();
			renderPage();

			const jsonRadio = screen.getByTestId('permission-editor-mode-json');
			await user.click(jsonRadio);

			expect(jsonRadio).toBeChecked();
			expect(screen.getByTestId('json-editor')).toBeInTheDocument();
		});

		it('switches back to interactive mode', async () => {
			const user = userEvent.setup();
			renderPage();

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
		it('renders all resource cards', () => {
			renderPage();

			expect(
				screen.getByTestId('resource-card-factor-api-key'),
			).toBeInTheDocument();
			expect(screen.getByTestId('resource-card-role')).toBeInTheDocument();
			expect(
				screen.getByTestId('resource-card-serviceaccount'),
			).toBeInTheDocument();
		});

		it('resource cards are collapsed by default', () => {
			renderPage();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const header = within(apiKeyCard).getByTestId(
				'resource-card-header-factor-api-key',
			);

			expect(header).toHaveAttribute('aria-expanded', 'false');
		});

		it('expands resource card when header clicked', async () => {
			const user = userEvent.setup();
			renderPage();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const header = within(apiKeyCard).getByTestId(
				'resource-card-header-factor-api-key',
			);

			await user.click(header);

			expect(header).toHaveAttribute('aria-expanded', 'true');
		});

		it('collapses expanded resource card when header clicked again', async () => {
			const user = userEvent.setup();
			renderPage();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const header = within(apiKeyCard).getByTestId(
				'resource-card-header-factor-api-key',
			);

			await user.click(header);
			await user.click(header);

			expect(header).toHaveAttribute('aria-expanded', 'false');
		});

		it('shows granted count in resource card header', () => {
			renderPage();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			expect(within(apiKeyCard).getByText(/0 \/ \d+ granted/)).toBeInTheDocument();
		});
	});

	describe('action toggles', () => {
		it('renders action toggles for each available action', async () => {
			renderPage();
			await expandAllCards();

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
			renderPage();
			await expandAllCards();

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
			renderPage();
			await expandAllCards();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			const allBtn = within(createToggle).getByText('All');
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
			renderPage();
			await expandAllCards();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(within(createToggle).getByText('All'));

			expect(within(apiKeyCard).getByText(/1 \/ \d+ granted/)).toBeInTheDocument();
		});
	});

	describe('Only Selected scope', () => {
		it('shows item input selector when Only Selected is chosen', async () => {
			const user = userEvent.setup();
			renderPage();
			await expandAllCards();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			const onlySelectedBtn = within(createToggle).getByText('Only selected');
			await user.click(onlySelectedBtn);

			expect(screen.getByTestId('item-input-selector')).toBeInTheDocument();
		});

		it('adds item when typed and Enter pressed', async () => {
			const user = userEvent.setup();
			renderPage();
			await expandAllCards();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(within(createToggle).getByText('Only selected'));

			const input = screen.getByTestId('item-input-selector-input');
			await user.type(input, 'api-key-001{enter}');

			expect(screen.getByText('api-key-001')).toBeInTheDocument();
		});

		it('adds item when Add button clicked', async () => {
			const user = userEvent.setup();
			renderPage();
			await expandAllCards();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(within(createToggle).getByText('Only selected'));

			const input = screen.getByTestId('item-input-selector-input');
			await user.type(input, 'api-key-002');

			const addBtn = screen.getByTestId('item-input-selector-add-btn');
			await user.click(addBtn);

			expect(screen.getByText('api-key-002')).toBeInTheDocument();
		});

		it('adds multiple items separated by comma', async () => {
			const user = userEvent.setup();
			renderPage();
			await expandAllCards();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(within(createToggle).getByText('Only selected'));

			const input = screen.getByTestId('item-input-selector-input');
			await user.type(input, 'key-a, key-b, key-c{enter}');

			expect(screen.getByText('key-a')).toBeInTheDocument();
			expect(screen.getByText('key-b')).toBeInTheDocument();
			expect(screen.getByText('key-c')).toBeInTheDocument();
		});

		it('adds multiple items separated by space', async () => {
			const user = userEvent.setup();
			renderPage();
			await expandAllCards();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(within(createToggle).getByText('Only selected'));

			const input = screen.getByTestId('item-input-selector-input');
			await user.type(input, 'key-x key-y key-z{enter}');

			expect(screen.getByText('key-x')).toBeInTheDocument();
			expect(screen.getByText('key-y')).toBeInTheDocument();
			expect(screen.getByText('key-z')).toBeInTheDocument();
		});

		it('does not add duplicate items', async () => {
			const user = userEvent.setup();
			renderPage();
			await expandAllCards();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(within(createToggle).getByText('Only selected'));

			const input = screen.getByTestId('item-input-selector-input');
			await user.type(input, 'same-key{enter}');
			await user.type(input, 'same-key{enter}');

			const badges = screen.getAllByText('same-key');
			expect(badges).toHaveLength(1);
		});

		it('removes item when X clicked', async () => {
			const user = userEvent.setup();
			renderPage();
			await expandAllCards();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(within(createToggle).getByText('Only selected'));

			const input = screen.getByTestId('item-input-selector-input');
			await user.type(input, 'removable-key{enter}');

			const removeBtn = screen.getByRole('button', {
				name: /remove removable-key/i,
			});
			await user.click(removeBtn);

			expect(screen.queryByText('removable-key')).not.toBeInTheDocument();
		});

		it('shows Add button disabled when input is empty', async () => {
			const user = userEvent.setup();
			renderPage();
			await expandAllCards();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(within(createToggle).getByText('Only selected'));

			const addBtn = screen.getByTestId('item-input-selector-add-btn');
			expect(addBtn).toBeDisabled();
		});
	});

	describe('scope change confirmation dialog', () => {
		it('shows confirm dialog when leaving Only Selected with items', async () => {
			const user = userEvent.setup();
			renderPage();
			await expandAllCards();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(within(createToggle).getByText('Only selected'));

			const input = screen.getByTestId('item-input-selector-input');
			await user.type(input, 'will-be-cleared{enter}');

			await user.click(within(createToggle).getByText('All'));

			await expect(
				screen.findByText('Change permission scope?'),
			).resolves.toBeInTheDocument();
		});

		it('clears items when confirmed', async () => {
			const user = userEvent.setup();
			renderPage();
			await expandAllCards();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(within(createToggle).getByText('Only selected'));

			const input = screen.getByTestId('item-input-selector-input');
			await user.type(input, 'to-be-cleared{enter}');

			await user.click(within(createToggle).getByText('All'));

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
			renderPage();
			await expandAllCards();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(within(createToggle).getByText('Only selected'));

			const input = screen.getByTestId('item-input-selector-input');
			await user.type(input, 'preserved-key{enter}');

			await user.click(within(createToggle).getByText('None'));

			const dialog = await screen.findByRole('dialog');
			await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

			expect(screen.getByText('preserved-key')).toBeInTheDocument();

			expect(screen.getByTestId('item-input-selector')).toBeInTheDocument();
		});

		it('does not show dialog when leaving Only Selected with no items', async () => {
			const user = userEvent.setup();
			renderPage();
			await expandAllCards();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);

			await user.click(within(createToggle).getByText('Only selected'));
			await user.click(within(createToggle).getByText('All'));

			expect(
				screen.queryByText('Change permission scope?'),
			).not.toBeInTheDocument();
		});
	});

	describe('verbs without Only Selected option', () => {
		it('does not show Only Selected for list verb', async () => {
			renderPage();
			await expandAllCards();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const listToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-list',
			);

			expect(
				within(listToggle).queryByText('Only selected'),
			).not.toBeInTheDocument();
			expect(within(listToggle).getByText('None')).toBeInTheDocument();
			expect(within(listToggle).getByText('All')).toBeInTheDocument();
		});
	});

	describe('collapse/expand all resources', () => {
		it('shows expand/collapse toggle group', () => {
			renderPage();

			expect(screen.getByTestId('toggle-all-group')).toBeInTheDocument();
			expect(screen.getByTestId('expand-all-button')).toBeInTheDocument();
			expect(screen.getByTestId('collapse-all-button')).toBeInTheDocument();
		});

		it('expands all cards when expand button clicked', async () => {
			renderPage();
			await expandAllCards();

			const apiKeyCard = screen.getByTestId('resource-card-factor-api-key');
			const header = within(apiKeyCard).getByTestId(
				'resource-card-header-factor-api-key',
			);
			expect(header).toHaveAttribute('aria-expanded', 'true');
		});
	});
});
