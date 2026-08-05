import { LlmpricingruletypesLLMPricingRuleUnitDTO as UnitDTO } from 'api/generated/services/sigNoz.schemas';
import {
	TOAST_MODEL_COST_DELETED,
	TOAST_MODEL_COST_UPDATED,
} from 'container/LLMObservability/Settings/ModelPricing/constants';
import {
	LLM_PRICING_ENDPOINT,
	LLM_PRICING_RULE_ENDPOINT,
	makeListResponse,
	mockRules,
} from 'container/LLMObservability/Settings/ModelPricing/__tests__/fixtures';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';

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

function resetUrl(): void {
	window.history.pushState(null, '', '/');
}

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
			expect(toastSuccess).toHaveBeenCalledWith(TOAST_MODEL_COST_DELETED),
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

	it('formats per-million prices in the row', async () => {
		setupList();
		render(<ModelCostTabPanel />);

		const openaiRow = (
			await screen.findByTestId('model-cell-name-rule-openai')
		).closest('tr') as HTMLElement;
		// mockRules gpt-4o has input cost 3 → rendered as $3.00.
		expect(within(openaiRow).getByText('$3.00')).toBeInTheDocument();
	});

	it('sends a normalized create payload when adding a rule', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		let body: Record<string, unknown> | null = null;
		setupList();
		server.use(
			rest.put(LLM_PRICING_ENDPOINT, async (req, res, ctx) => {
				body = await req.json();
				return res(ctx.status(200), ctx.json({ status: 'success' }));
			}),
		);
		render(<ModelCostTabPanel />);

		await screen.findByTestId('model-cell-name-rule-openai');
		await user.click(screen.getByTestId('add-model-cost-btn'));

		// Leading/trailing whitespace should be trimmed off the model id.
		await user.type(
			await screen.findByTestId('drawer-model-id-input'),
			'  gpt-4o-mini  ',
		);
		await user.type(screen.getByTestId('drawer-input-cost'), '3');
		await user.type(screen.getByTestId('drawer-output-cost'), '9');
		await user.click(screen.getByTestId('drawer-save-btn'));

		await waitFor(() => expect(body).not.toBeNull());
		// The create call submits a bulk `rules` array of normalized payloads.
		const [payload] = (
			body as unknown as {
				rules: Record<string, unknown>[];
			}
		).rules;
		expect(payload).toMatchObject({
			modelName: 'gpt-4o-mini',
			provider: 'OpenAI',
			isOverride: true,
			enabled: true,
			unit: UnitDTO.per_million_tokens,
			pricing: { input: 3, output: 9 },
		});
	});

	it('sends an updated payload when editing a rule', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		let body: Record<string, unknown> | null = null;
		setupList();
		server.use(
			rest.put(LLM_PRICING_ENDPOINT, async (req, res, ctx) => {
				body = await req.json();
				return res(ctx.status(200), ctx.json({ status: 'success' }));
			}),
		);
		render(<ModelCostTabPanel />);

		await screen.findByTestId('model-cell-name-rule-openai');
		await openRowMenu(user, 'rule-openai');
		await user.click(await screen.findByText('Edit'));

		// Model id + provider are locked in edit mode; change the prefilled input cost.
		const inputCost = await screen.findByTestId('drawer-input-cost');
		await user.clear(inputCost);
		await user.type(inputCost, '5');
		await user.click(screen.getByTestId('drawer-save-btn'));

		await waitFor(() => expect(body).not.toBeNull());
		const [payload] = (
			body as unknown as {
				rules: Record<string, unknown>[];
			}
		).rules;
		// Edit carries the rule id; disabled model/provider are still submitted and
		// the edited price flows through, while output keeps its prefilled value.
		expect(payload).toMatchObject({
			id: 'rule-openai',
			modelName: 'gpt-4o',
			provider: 'OpenAI',
			isOverride: true,
			enabled: true,
			unit: UnitDTO.per_million_tokens,
			pricing: { input: 5, output: 9 },
		});
		await waitFor(() =>
			expect(toastSuccess).toHaveBeenCalledWith(TOAST_MODEL_COST_UPDATED),
		);
	});
});
