import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';

import {
	LLM_PRICING_ENDPOINT,
	LLM_PRICING_RULE_ENDPOINT,
	makeListResponse,
	mockRules,
} from '../../__tests__/fixtures';
import ModelCostTabPanel from '../ModelCostTabPanel';

const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: {
		success: (...args: unknown[]): void => toastSuccess(...args),
		error: (...args: unknown[]): void => toastError(...args),
	},
}));

function setupList(items = mockRules, total = items.length): void {
	server.use(
		rest.get(LLM_PRICING_ENDPOINT, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(makeListResponse(items, total))),
		),
	);
}

// The list panel keeps page/search/source in the URL via nuqs, which reads
// window.location. jsdom shares that across tests in a file, so reset it.
function resetUrl(): void {
	window.history.pushState(null, '', '/');
}

// The row kebab is a DropdownMenuSimple trigger; its testId isn't forwarded, so
// select it as the row's only button and open the Edit/Delete menu.
async function openRowMenu(
	user: ReturnType<typeof userEvent.setup>,
	ruleId: string,
): Promise<void> {
	const row = screen.getByTestId(`model-cell-name-${ruleId}`).closest('tr');
	await user.click(within(row as HTMLElement).getByRole('button'));
}

describe('ModelCostTabPanel (integration)', () => {
	beforeEach(() => {
		resetUrl();
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders pricing rules returned by the list API', async () => {
		setupList();
		render(<ModelCostTabPanel />);

		const openaiCell = await screen.findByTestId('model-cell-name-rule-openai');
		expect(openaiCell).toHaveTextContent('gpt-4o');
		expect(
			screen.getByTestId('model-cell-name-rule-anthropic'),
		).toHaveTextContent('claude-3-5-sonnet');
		// Canonical id under the model name + provider column.
		expect(screen.getByText('openai:gpt-4o')).toBeInTheDocument();
		expect(screen.getAllByText('OpenAI').length).toBeGreaterThan(0);
		// Source badges reflect the override flag.
		expect(screen.getByTestId('source-badge-rule-openai')).toHaveTextContent(
			'User override',
		);
		expect(screen.getByTestId('source-badge-rule-anthropic')).toHaveTextContent(
			'Auto',
		);
	});

	it('shows the empty state when there are no rules', async () => {
		setupList([], 0);
		render(<ModelCostTabPanel />);

		const empty = await screen.findByTestId('model-costs-empty');
		expect(empty).toHaveTextContent('No model costs yet.');
	});

	it('shows an error message when the list request fails', async () => {
		server.use(
			rest.get(LLM_PRICING_ENDPOINT, (_req, res, ctx) => res(ctx.status(500))),
		);
		render(<ModelCostTabPanel />);

		const alert = await screen.findByRole('alert');
		expect(alert).toHaveTextContent(
			'Failed to load pricing rules. Please try again.',
		);
	});

	it('sends the debounced search term as the q param', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		let lastParams: URLSearchParams | null = null;
		server.use(
			rest.get(LLM_PRICING_ENDPOINT, (req, res, ctx) => {
				lastParams = req.url.searchParams;
				return res(ctx.status(200), ctx.json(makeListResponse(mockRules)));
			}),
		);
		render(<ModelCostTabPanel />);

		await screen.findByTestId('model-cell-name-rule-openai');
		await user.type(
			screen.getByPlaceholderText('Search by model or provider'),
			'claude',
		);

		await waitFor(() => expect(lastParams?.get('q')).toBe('claude'));
	});

	it('clears the search via the clear button', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupList();
		render(<ModelCostTabPanel />);

		const input = screen.getByPlaceholderText(
			'Search by model or provider',
		) as HTMLInputElement;
		await user.type(input, 'gpt');
		expect(input.value).toBe('gpt');

		await user.click(screen.getByTestId('model-cost-search-clear'));
		await waitFor(() => expect(input.value).toBe(''));
	});

	it('sends isOverride=true when the source filter is set to User override', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		let lastParams: URLSearchParams | null = null;
		server.use(
			rest.get(LLM_PRICING_ENDPOINT, (req, res, ctx) => {
				lastParams = req.url.searchParams;
				return res(ctx.status(200), ctx.json(makeListResponse(mockRules)));
			}),
		);
		render(<ModelCostTabPanel />);

		await screen.findByTestId('model-cell-name-rule-openai');
		await user.click(screen.getByTestId('source-filter'));
		// Scope to the listbox option — "User override" also appears as a row badge.
		await user.click(
			await screen.findByRole('option', { name: 'User override' }),
		);

		await waitFor(() => expect(lastParams?.get('isOverride')).toBe('true'));
	});

	it('opens the add drawer for a manager (ADMIN)', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupList();
		render(<ModelCostTabPanel />);

		await screen.findByTestId('model-cell-name-rule-openai');
		await user.click(screen.getByTestId('add-model-cost-btn'));

		const modelInput = await screen.findByTestId('drawer-model-id-input');
		expect(modelInput).toBeInTheDocument();
		expect(screen.getByTestId('drawer-save-btn')).toBeInTheDocument();
	});

	it('hides the add button and row actions for a viewer', async () => {
		setupList();
		render(<ModelCostTabPanel />, undefined, { role: 'VIEWER' });

		const row = (
			await screen.findByTestId('model-cell-name-rule-openai')
		).closest('tr') as HTMLElement;
		expect(screen.queryByTestId('add-model-cost-btn')).not.toBeInTheDocument();
		// View-only rows render no action menu (no buttons in the row).
		expect(within(row).queryByRole('button')).not.toBeInTheDocument();
	});

	it('opens the edit drawer prefilled from the row action menu', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupList();
		render(<ModelCostTabPanel />);

		await screen.findByTestId('model-cell-name-rule-openai');
		await openRowMenu(user, 'rule-openai');
		await user.click(await screen.findByText('Edit'));

		const drawerTitle = await screen.findByText('Edit model cost');
		expect(drawerTitle).toBeInTheDocument();
		const modelInput = screen.getByTestId(
			'drawer-model-id-input',
		) as HTMLInputElement;
		expect(modelInput.value).toBe('gpt-4o');
		expect(modelInput).toBeDisabled();
	});

	it('deletes a rule through the confirm dialog', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		let deletedId: string | null = null;
		setupList();
		server.use(
			rest.delete(LLM_PRICING_RULE_ENDPOINT, (req, res, ctx) => {
				deletedId = req.params.id as string;
				return res(ctx.status(200), ctx.json({ status: 'success' }));
			}),
		);
		render(<ModelCostTabPanel />);

		await screen.findByTestId('model-cell-name-rule-openai');
		await openRowMenu(user, 'rule-openai');
		await user.click(await screen.findByText('Delete'));

		await user.click(await screen.findByTestId('drawer-delete-confirm-btn'));

		await waitFor(() => expect(deletedId).toBe('rule-openai'));
		await waitFor(() =>
			expect(toastSuccess).toHaveBeenCalledWith('Model cost deleted'),
		);
	});

	it('renders cache buckets for rules that have cache pricing', async () => {
		setupList();
		render(<ModelCostTabPanel />);

		const anthropicRow = (
			await screen.findByTestId('model-cell-name-rule-anthropic')
		).closest('tr') as HTMLElement;
		expect(within(anthropicRow).getByText(/Cache Read/i)).toBeInTheDocument();
		expect(within(anthropicRow).getByText(/Cache Write/i)).toBeInTheDocument();
	});
});
