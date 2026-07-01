import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import { makePricingRule } from '../../../../__tests__/fixtures';
import { EMPTY_DRAFT } from '../../../../constants';
import { draftFromRule } from '../../../../utils';
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
});
