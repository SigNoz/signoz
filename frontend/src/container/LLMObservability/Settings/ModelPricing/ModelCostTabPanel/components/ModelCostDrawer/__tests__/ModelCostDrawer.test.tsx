import { makePricingRule } from 'container/LLMObservability/Settings/ModelPricing/__tests__/fixtures';
import { EMPTY_DRAFT } from 'container/LLMObservability/Settings/ModelPricing/constants';
import { draftFromRule } from 'container/LLMObservability/Settings/ModelPricing/utils';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import ModelCostDrawer from '../ModelCostDrawer';

const editDraft = draftFromRule(
	makePricingRule({
		id: 'rule-openai',
		modelName: 'gpt-4o',
		provider: 'OpenAI',
	}),
);

describe('ModelCostDrawer (integration)', () => {
	it('renders the add title and a save button for a manager', () => {
		render(
			<ModelCostDrawer
				isOpen
				mode="add"
				initialDraft={EMPTY_DRAFT}
				onClose={jest.fn()}
				onSave={jest.fn()}
				isSaving={false}
				saveError={null}
				canManage
			/>,
		);

		expect(screen.getByText('Add model cost')).toBeInTheDocument();
		expect(screen.getByTestId('drawer-save-btn')).toBeInTheDocument();
	});

	it('disables save until the form is dirty', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(
			<ModelCostDrawer
				isOpen
				mode="add"
				initialDraft={EMPTY_DRAFT}
				onClose={jest.fn()}
				onSave={jest.fn()}
				isSaving={false}
				saveError={null}
				canManage
			/>,
		);

		expect(screen.getByTestId('drawer-save-btn')).toBeDisabled();

		await user.type(screen.getByTestId('drawer-model-id-input'), 'openai:gpt-4o');

		await waitFor(() =>
			expect(screen.getByTestId('drawer-save-btn')).toBeEnabled(),
		);
	});

	it('shows the model id required error and does not call onSave when the name is empty', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onSave = jest.fn();
		render(
			<ModelCostDrawer
				isOpen
				mode="add"
				initialDraft={EMPTY_DRAFT}
				onClose={jest.fn()}
				onSave={onSave}
				isSaving={false}
				saveError={null}
				canManage
			/>,
		);

		// Make the form dirty without touching the model id: add a pattern, which
		// mutates the `patterns` form field while leaving the name empty.
		await user.type(screen.getByTestId('drawer-pattern-input'), 'gpt');
		await user.click(screen.getByTestId('drawer-pattern-add-btn'));

		await waitFor(() =>
			expect(screen.getByTestId('drawer-save-btn')).toBeEnabled(),
		);
		await user.click(screen.getByTestId('drawer-save-btn'));

		const error = await screen.findByText('Billing model ID is required.');
		expect(error).toBeInTheDocument();
		expect(onSave).not.toHaveBeenCalled();
	});

	it('calls onSave once on the happy path with valid model id and pricing', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onSave = jest.fn();
		render(
			<ModelCostDrawer
				isOpen
				mode="add"
				initialDraft={EMPTY_DRAFT}
				onClose={jest.fn()}
				onSave={onSave}
				isSaving={false}
				saveError={null}
				canManage
			/>,
		);

		await user.type(screen.getByTestId('drawer-model-id-input'), 'openai:gpt-4o');
		await user.type(screen.getByTestId('drawer-input-cost'), '3');
		await user.type(screen.getByTestId('drawer-output-cost'), '9');

		await user.click(screen.getByTestId('drawer-save-btn'));

		await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
	});

	it('renders the edit title with disabled, prefilled model id and disabled provider', () => {
		render(
			<ModelCostDrawer
				isOpen
				mode="edit"
				initialDraft={editDraft}
				onClose={jest.fn()}
				onSave={jest.fn()}
				isSaving={false}
				saveError={null}
				canManage
			/>,
		);

		expect(screen.getByText('Edit model cost')).toBeInTheDocument();
		const modelInput = screen.getByTestId(
			'drawer-model-id-input',
		) as HTMLInputElement;
		expect(modelInput.value).toBe('gpt-4o');
		expect(modelInput).toBeDisabled();
		expect(screen.getByTestId('drawer-provider-select')).toBeDisabled();
	});

	it('renders a read-only view with a Close button and no save for a viewer', () => {
		render(
			<ModelCostDrawer
				isOpen
				mode="edit"
				initialDraft={editDraft}
				onClose={jest.fn()}
				onSave={jest.fn()}
				isSaving={false}
				saveError={null}
				canManage={false}
			/>,
		);

		expect(screen.getByText('View model cost')).toBeInTheDocument();
		expect(screen.queryByTestId('drawer-save-btn')).not.toBeInTheDocument();
		expect(screen.getByTestId('drawer-cancel-btn')).toHaveTextContent('Close');
	});

	it('renders the save error text', () => {
		render(
			<ModelCostDrawer
				isOpen
				mode="add"
				initialDraft={EMPTY_DRAFT}
				onClose={jest.fn()}
				onSave={jest.fn()}
				isSaving={false}
				saveError="boom"
				canManage
			/>,
		);

		expect(screen.getByText('boom')).toBeInTheDocument();
	});

	it('adds and removes a model pattern from the editor', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(
			<ModelCostDrawer
				isOpen
				mode="add"
				initialDraft={EMPTY_DRAFT}
				onClose={jest.fn()}
				onSave={jest.fn()}
				isSaving={false}
				saveError={null}
				canManage
			/>,
		);

		await user.type(screen.getByTestId('drawer-pattern-input'), 'gpt-5');
		await user.click(screen.getByTestId('drawer-pattern-add-btn'));
		// The added pattern renders as a removable chip.
		const removeChip = screen.getByRole('button', {
			name: 'Remove pattern gpt-5',
		});
		expect(removeChip).toBeInTheDocument();

		await user.click(removeChip);
		expect(
			screen.queryByRole('button', { name: 'Remove pattern gpt-5' }),
		).not.toBeInTheDocument();
	});

	it('adds a cache pricing bucket via the picker and removes it', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(
			<ModelCostDrawer
				isOpen
				mode="add"
				initialDraft={EMPTY_DRAFT}
				onClose={jest.fn()}
				onSave={jest.fn()}
				isSaving={false}
				saveError={null}
				canManage
			/>,
		);

		await user.click(screen.getByTestId('drawer-add-bucket-btn'));
		await user.click(screen.getByTestId('drawer-add-bucket-cache-read'));

		// Adding the bucket reveals its cost input and the shared cache-mode select.
		expect(screen.getByTestId('drawer-cache-read-cost')).toBeInTheDocument();
		expect(screen.getByTestId('drawer-cache-mode')).toBeInTheDocument();

		await user.click(screen.getByTestId('drawer-remove-cache-read'));
		expect(
			screen.queryByTestId('drawer-cache-read-cost'),
		).not.toBeInTheDocument();
	});

	it('blocks save with a pricing error when an override rule has no input cost', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onSave = jest.fn();
		render(
			<ModelCostDrawer
				isOpen
				mode="add"
				initialDraft={EMPTY_DRAFT}
				onClose={jest.fn()}
				onSave={onSave}
				isSaving={false}
				saveError={null}
				canManage
			/>,
		);

		// EMPTY_DRAFT defaults to an override with empty pricing. Fill only the
		// model id + output cost so the form is dirty but the input cost is missing.
		await user.type(screen.getByTestId('drawer-model-id-input'), 'openai:gpt-4o');
		await user.type(screen.getByTestId('drawer-output-cost'), '9');
		await user.click(screen.getByTestId('drawer-save-btn'));

		await expect(
			screen.findByText('Input cost must be greater than 0.'),
		).resolves.toBeInTheDocument();
		expect(onSave).not.toHaveBeenCalled();
	});

	it('requires confirmation to reset an override rule back to auto', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(
			<ModelCostDrawer
				isOpen
				mode="edit"
				initialDraft={editDraft}
				onClose={jest.fn()}
				onSave={jest.fn()}
				isSaving={false}
				saveError={null}
				canManage
			/>,
		);

		// Pricing is editable while the rule is an override.
		expect(screen.getByTestId('drawer-input-cost')).toBeEnabled();

		// Picking "auto" surfaces a confirm step instead of applying immediately.
		await user.click(screen.getByTestId('drawer-source-auto'));
		expect(screen.getByTestId('drawer-reset-confirm-btn')).toBeInTheDocument();
		expect(screen.getByTestId('drawer-input-cost')).toBeEnabled();

		// Keep backs out of the reset.
		await user.click(screen.getByTestId('drawer-reset-keep-btn'));
		expect(
			screen.queryByTestId('drawer-reset-confirm-btn'),
		).not.toBeInTheDocument();

		// Confirming the reset flips the rule to auto and locks pricing.
		await user.click(screen.getByTestId('drawer-source-auto'));
		await user.click(screen.getByTestId('drawer-reset-confirm-btn'));
		await waitFor(() =>
			expect(screen.getByTestId('drawer-input-cost')).toBeDisabled(),
		);
	});
});
