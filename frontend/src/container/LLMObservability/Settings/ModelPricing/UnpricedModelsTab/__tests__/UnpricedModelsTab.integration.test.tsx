import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import type { LlmpricingruletypesUpdatableLLMPricingRulesDTO } from 'api/generated/services/sigNoz.schemas';

import UnpricedModelsTab from '../UnpricedModelsTab';
import {
	LLM_PRICING_ENDPOINT,
	LLM_UNMAPPED_ENDPOINT,
	makeListResponse,
	makeUnmappedResponse,
	mockRules,
} from '../../__tests__/fixtures';

const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: {
		success: (...args: unknown[]): void => toastSuccess(...args),
		error: (...args: unknown[]): void => toastError(...args),
	},
}));

const MODEL = 'gpt-4o-mini-2024-07-18';

function setup(): void {
	server.use(
		rest.get(LLM_UNMAPPED_ENDPOINT, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(makeUnmappedResponse())),
		),
		rest.get(LLM_PRICING_ENDPOINT, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(makeListResponse(mockRules))),
		),
	);
}

// Picks a billing model in a row's dropdown: open the combobox, then click the
// option. The dropdown fetches its options from the rules list (mocked above).
async function selectRule(
	user: ReturnType<typeof userEvent.setup>,
	modelName: string,
	ruleId: string,
): Promise<void> {
	await user.click(screen.getByTestId(`map-to-select-${modelName}`));
	await user.click(await screen.findByTestId(`map-to-option-${ruleId}`));
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

	it('keeps the Save button disabled until a billing model is selected', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<UnpricedModelsTab />);

		await screen.findByTestId(`unpriced-model-name-${MODEL}`);

		const saveBtn = screen.getByTestId('unpriced-save-btn');
		expect(saveBtn).toBeDisabled();

		await selectRule(user, MODEL, 'rule-openai');

		await waitFor(() => expect(saveBtn).not.toBeDisabled());
		expect(saveBtn).toHaveTextContent('Save 1 model');
	});

	it('clears a selection via the row clear button, re-disabling Save', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<UnpricedModelsTab />);

		await screen.findByTestId(`unpriced-model-name-${MODEL}`);

		const saveBtn = screen.getByTestId('unpriced-save-btn');
		// The clear button only shows once a rule is picked.
		expect(screen.queryByTestId(`map-to-clear-${MODEL}`)).not.toBeInTheDocument();

		await selectRule(user, MODEL, 'rule-openai');
		await waitFor(() => expect(saveBtn).not.toBeDisabled());

		await user.click(await screen.findByTestId(`map-to-clear-${MODEL}`));

		await waitFor(() => expect(saveBtn).toBeDisabled());
		expect(saveBtn).toHaveTextContent('Save models');
		expect(screen.queryByTestId(`map-to-clear-${MODEL}`)).not.toBeInTheDocument();
	});

	it('opens a confirm dialog and commits the mapping in one request', async () => {
		const sent: LlmpricingruletypesUpdatableLLMPricingRulesDTO[] = [];
		server.use(
			rest.put(LLM_PRICING_ENDPOINT, async (req, res, ctx) => {
				sent.push(await req.json());
				return res(ctx.status(200), ctx.json({ status: 'success' }));
			}),
		);

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<UnpricedModelsTab />);

		await screen.findByTestId(`unpriced-model-name-${MODEL}`);
		await selectRule(user, MODEL, 'rule-openai');

		await user.click(screen.getByTestId('unpriced-save-btn'));

		// Confirm dialog lists the pending mapping.
		const confirmItem = await screen.findByTestId(
			`unpriced-map-confirm-item-${MODEL}`,
		);
		expect(confirmItem).toBeInTheDocument();

		await user.click(screen.getByTestId('unpriced-map-confirm-btn'));

		await waitFor(() => expect(sent).toHaveLength(1));
		expect(sent[0].rules).toHaveLength(1);
		expect(sent[0].rules?.[0].modelPattern).toContain(MODEL);
		await waitFor(() =>
			expect(toastSuccess).toHaveBeenCalledWith('Mapped 1 model'),
		);
	});
});
