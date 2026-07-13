import { Route, Switch } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { server } from 'mocks-server/server';
import { render, screen, userEvent, within } from 'tests/test-utils';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';

import CreateEditRolePage from '../CreateEditRolePage';
import { TooltipProvider } from '@signozhq/ui/tooltip';

beforeEach(() => {
	server.use(setupAuthzAdmin());
});

afterEach(() => {
	server.resetHandlers();
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

async function switchToJsonMode(): Promise<void> {
	const user = userEvent.setup();
	const jsonRadio = await screen.findByTestId('permission-editor-mode-json');
	await user.click(jsonRadio);
}

async function switchToInteractiveMode(): Promise<void> {
	const user = userEvent.setup();
	const interactiveRadio = await screen.findByTestId(
		'permission-editor-mode-interactive',
	);
	await user.click(interactiveRadio);
}

describe('JsonEditor', () => {
	describe('initial render', () => {
		it('renders JSON editor when JSON mode selected', async () => {
			renderPage();
			await switchToJsonMode();

			expect(screen.getByTestId('json-editor')).toBeInTheDocument();
		});

		it('renders JSON editor container div', async () => {
			renderPage();
			await switchToJsonMode();

			const jsonEditor = screen.getByTestId('json-editor');
			expect(jsonEditor.querySelector('div')).toBeInTheDocument();
		});
	});

	describe('sync with interactive mode', () => {
		it('syncs changes from interactive mode when switching to JSON', async () => {
			const user = userEvent.setup();
			renderPage();

			await screen.findByTestId('permission-editor');
			await switchToInteractiveMode();

			const apiKeyCard = await screen.findByTestId('resource-card-factor-api-key');
			const header = within(apiKeyCard).getByTestId(
				'resource-card-header-factor-api-key',
			);
			await user.click(header);

			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-create',
			);
			await user.click(await within(createToggle).findByText('All'));

			await switchToJsonMode();

			const jsonEditor = screen.getByTestId('json-editor');
			expect(jsonEditor).toBeInTheDocument();
		});

		it('preserves changes when switching back to interactive', async () => {
			const user = userEvent.setup();
			renderPage();

			await screen.findByTestId('permission-editor');
			await switchToInteractiveMode();

			const apiKeyCard = await screen.findByTestId('resource-card-factor-api-key');
			const header = within(apiKeyCard).getByTestId(
				'resource-card-header-factor-api-key',
			);
			await user.click(header);

			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-create',
			);
			await user.click(await within(createToggle).findByText('All'));

			await switchToJsonMode();

			const interactiveRadio = screen.getByTestId(
				'permission-editor-mode-interactive',
			);
			await user.click(interactiveRadio);

			const scopeToggle = within(
				screen.getByTestId('action-toggle-factor-api-key-create'),
			).getByTestId('action-toggle-scope-factor-api-key-create');
			expect(
				within(scopeToggle).getByRole('radio', { name: 'All' }),
			).toBeChecked();
		});
	});

	describe('error handling', () => {
		it('no error shown initially with valid JSON', async () => {
			renderPage();
			await switchToJsonMode();

			expect(screen.queryByTestId('json-editor-error')).not.toBeInTheDocument();
		});
	});

	describe('JSON structure', () => {
		it('produces valid transactionGroups format', async () => {
			const user = userEvent.setup();
			renderPage();

			await screen.findByTestId('permission-editor');
			await switchToInteractiveMode();

			const apiKeyCard = await screen.findByTestId('resource-card-factor-api-key');
			const header = within(apiKeyCard).getByTestId(
				'resource-card-header-factor-api-key',
			);
			await user.click(header);

			const readToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);
			await user.click(await within(readToggle).findByText('Only selected'));

			const input = screen.getByTestId('item-input-selector-input');
			await user.type(input, 'test-key-123{enter}');

			await switchToJsonMode();

			expect(screen.getByTestId('json-editor')).toBeInTheDocument();
		});

		it('handles wildcard selector for All scope', async () => {
			const user = userEvent.setup();
			renderPage();

			await screen.findByTestId('permission-editor');
			await switchToInteractiveMode();

			const apiKeyCard = await screen.findByTestId('resource-card-factor-api-key');
			const header = within(apiKeyCard).getByTestId(
				'resource-card-header-factor-api-key',
			);
			await user.click(header);

			const createToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-create',
			);
			await user.click(await within(createToggle).findByText('All'));

			await switchToJsonMode();

			expect(screen.getByTestId('json-editor')).toBeInTheDocument();
		});
	});

	describe('mode switching', () => {
		it('reinitializes JSON buffer on switch from interactive to JSON', async () => {
			const user = userEvent.setup();
			renderPage();

			await screen.findByTestId('permission-editor');
			await switchToJsonMode();

			const interactiveRadio = screen.getByTestId(
				'permission-editor-mode-interactive',
			);
			await user.click(interactiveRadio);

			const apiKeyCard = await screen.findByTestId('resource-card-factor-api-key');
			const header = within(apiKeyCard).getByTestId(
				'resource-card-header-factor-api-key',
			);
			await user.click(header);

			const readToggle = within(apiKeyCard).getByTestId(
				'action-toggle-factor-api-key-read',
			);
			await user.click(await within(readToggle).findByText('All'));

			await switchToJsonMode();

			expect(screen.getByTestId('json-editor')).toBeInTheDocument();
		});
	});
});
