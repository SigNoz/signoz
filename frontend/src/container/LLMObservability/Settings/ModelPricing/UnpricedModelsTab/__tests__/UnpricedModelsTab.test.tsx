import type { LlmpricingruletypesUpdatableLLMPricingRulesDTO } from 'api/generated/services/sigNoz.schemas';
import {
	LLM_PRICING_ENDPOINT,
	LLM_UNMAPPED_ENDPOINT,
	makeListResponse,
	makeUnmappedResponse,
	mockRules,
	mockUnpricedModels,
} from 'container/LLMObservability/Settings/ModelPricing/__tests__/fixtures';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';
import { NO_DELAY_USER_EVENT } from 'tests/noDelayUserEvent';

import UnpricedModelsTab from '../UnpricedModelsTab';
import { usePendingMappingStore } from '../usePendingMappingStore';

// One antd skeleton renders per placeholder row and per dropdown option on every
// load, so fewer of them keep each test's first paint cheap.
jest.mock('container/LLMObservability/Settings/ModelPricing/constants', () => ({
	...jest.requireActual(
		'container/LLMObservability/Settings/ModelPricing/constants',
	),
	SKELETON_ROW_COUNT: 1,
	RULE_OPTIONS_LIMIT: 2,
}));

const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock('@signozhq/ui/toast', () => ({
	...jest.requireActual('@signozhq/ui/toast'),
	toast: {
		success: (...args: unknown[]): void => toastSuccess(...args),
		danger: (...args: unknown[]): void => toastError(...args),
	},
}));

const [UNPRICED_MODEL] = mockUnpricedModels;
const MODEL = UNPRICED_MODEL.modelName;
const [TARGET_RULE] = mockRules;

function stageMapping(): void {
	usePendingMappingStore.setState({
		pending: { model: UNPRICED_MODEL, rule: TARGET_RULE },
	});
}

function setup(): void {
	server.use(
		rest.get(LLM_UNMAPPED_ENDPOINT, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(makeUnmappedResponse([UNPRICED_MODEL]))),
		),
		rest.get(LLM_PRICING_ENDPOINT, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(makeListResponse(mockRules))),
		),
	);
}

// Picks a billing model in a row's dropdown: open the combobox, wait for the
// options (fetched from the rules list mocked above), then arrow down to the
// option and press Enter in its search box. jsdom cannot deliver the pointer
// click Base UI expects on an option.
async function selectRule(
	user: ReturnType<typeof userEvent.setup>,
	modelName: string,
	ruleId: string,
): Promise<void> {
	await user.click(screen.getByTestId(`map-to-select-${modelName}`));
	await screen.findByTestId(`map-to-option-${ruleId}`);
	const index = screen
		.getAllByTestId(/^map-to-option-/)
		.findIndex(
			(option) => option.getAttribute('data-testid') === `map-to-option-${ruleId}`,
		);
	await user.type(
		screen.getByTestId(`map-to-select-${modelName}-search`),
		`${'{ArrowDown}'.repeat(index + 1)}{Enter}`,
	);
}

describe('UnpricedModelsTab (integration)', () => {
	beforeEach(() => {
		window.history.pushState(null, '', '/');
		setup();
	});

	afterEach(() => {
		server.resetHandlers();
		toastSuccess.mockClear();
		toastError.mockClear();
	});

	it('cancels the mapping without committing', async () => {
		const sent: LlmpricingruletypesUpdatableLLMPricingRulesDTO[] = [];
		server.use(
			rest.put(LLM_PRICING_ENDPOINT, async (req, res, ctx) => {
				sent.push(await req.json());
				return res(ctx.status(200), ctx.json({ status: 'success' }));
			}),
		);

		stageMapping();
		const user = userEvent.setup(NO_DELAY_USER_EVENT);
		render(<UnpricedModelsTab />);

		await user.click(await screen.findByTestId('unpriced-map-cancel-btn'));

		await waitFor(() =>
			expect(
				screen.queryByTestId(`unpriced-map-confirm-item-${MODEL}`),
			).not.toBeInTheDocument(),
		);
		expect(sent).toHaveLength(0);
	});

	it('opens the confirm dialog with the target rule pricing when a model is picked', async () => {
		const user = userEvent.setup(NO_DELAY_USER_EVENT);
		render(<UnpricedModelsTab />);

		await screen.findByTestId(`unpriced-model-name-${MODEL}`);

		// Picking a rule stages the mapping in the confirm dialog.
		await selectRule(user, MODEL, 'rule-openai');

		const confirmItem = await screen.findByTestId(
			`unpriced-map-confirm-item-${MODEL}`,
		);
		expect(confirmItem).toBeInTheDocument();
		// Shows the target billing model + its pricing so the user can eyeball it.
		expect(screen.getByText('openai:gpt-4o')).toBeInTheDocument();
		expect(screen.getByText('$3.00')).toBeInTheDocument();
		expect(screen.getByText('$9.00')).toBeInTheDocument();
		// While the dialog is open, the row's trigger mirrors the staged pick
		// instead of the placeholder.
		const trigger = screen.getByTestId(`map-to-select-${MODEL}`);
		expect(
			within(trigger).getByText('openai:gpt-4o ($3.00/$9.00)'),
		).toBeInTheDocument();
	});

	it('reverts the row trigger to the placeholder when the mapping is cancelled', async () => {
		stageMapping();
		const user = userEvent.setup(NO_DELAY_USER_EVENT);
		render(<UnpricedModelsTab />);

		const trigger = await screen.findByTestId(`map-to-select-${MODEL}`);
		expect(
			within(trigger).getByText('openai:gpt-4o ($3.00/$9.00)'),
		).toBeInTheDocument();

		await user.click(screen.getByTestId('unpriced-map-cancel-btn'));

		expect(
			within(trigger).getByText('Select / Create a pricing model'),
		).toBeInTheDocument();
	});

	it('commits the mapping in one request when confirmed', async () => {
		const sent: LlmpricingruletypesUpdatableLLMPricingRulesDTO[] = [];
		server.use(
			rest.put(LLM_PRICING_ENDPOINT, async (req, res, ctx) => {
				sent.push(await req.json());
				return res(ctx.status(200), ctx.json({ status: 'success' }));
			}),
		);

		stageMapping();
		const user = userEvent.setup(NO_DELAY_USER_EVENT);
		render(<UnpricedModelsTab />);

		await user.click(await screen.findByTestId('unpriced-map-confirm-btn'));

		await waitFor(() => expect(sent).toHaveLength(1));
		expect(sent[0].rules).toHaveLength(1);
		expect(sent[0].rules?.[0].modelPattern).toContain(MODEL);
		await waitFor(() =>
			expect(toastSuccess).toHaveBeenCalledWith('Mapped model'),
		);
		// Dialog closes on success.
		await waitFor(() =>
			expect(
				screen.queryByTestId(`unpriced-map-confirm-item-${MODEL}`),
			).not.toBeInTheDocument(),
		);
	});

	it('opens the add-cost drawer prefilled when creating pricing for a model', async () => {
		const user = userEvent.setup(NO_DELAY_USER_EVENT);
		render(<UnpricedModelsTab />);

		await screen.findByTestId(`unpriced-model-name-${MODEL}`);

		// Open the row's dropdown and take the "Create a new pricing model" escape hatch
		// instead of mapping onto an existing billing model.
		await user.click(screen.getByTestId(`map-to-select-${MODEL}`));
		await user.click(await screen.findByTestId(`map-to-create-${MODEL}`));

		// The shared add-cost drawer opens with the model name prefilled.
		const drawerTitle = await screen.findByText('Add model cost');
		expect(drawerTitle).toBeInTheDocument();
		expect(screen.getByTestId('drawer-model-id-input-field')).toHaveValue(MODEL);
	});
});
