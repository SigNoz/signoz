import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen } from 'tests/test-utils';

import { EMPTY_DRAFT } from '../constants';
import type { DrawerDraft } from '../types';
import ModelCostDrawer from '../ModelCostDrawer';

interface HarnessProps {
	initialDraft?: DrawerDraft;
	mode?: 'add' | 'edit';
	canManage?: boolean;
	onSave?: () => void;
	onDelete?: () => void;
}

function Harness({
	initialDraft = {
		...EMPTY_DRAFT,
		modelName: 'gpt-4o',
		pricing: { ...EMPTY_DRAFT.pricing, input: 1, output: 1 },
	},
	mode = 'add',
	canManage = true,
	onSave = jest.fn(),
	onDelete = jest.fn(),
}: HarnessProps): JSX.Element {
	const [draft, setDraft] = useState<DrawerDraft>(initialDraft);
	return (
		<ModelCostDrawer
			isOpen
			mode={mode}
			draft={draft}
			setDraft={setDraft}
			onClose={jest.fn()}
			onSave={onSave}
			onDelete={onDelete}
			isSaving={false}
			isDeleting={false}
			saveError={null}
			canManage={canManage}
		/>
	);
}

describe('ModelCostDrawer', () => {
	it('adds a pattern chip when the user types and presses Enter', () => {
		render(<Harness />);

		fireEvent.change(screen.getByTestId('drawer-pattern-input'), {
			target: { value: 'gpt-4o-mini' },
		});
		fireEvent.keyDown(screen.getByTestId('drawer-pattern-input'), {
			key: 'Enter',
			code: 'Enter',
		});

		expect(screen.getByText('gpt-4o-mini*')).toBeInTheDocument();
	});

	it('disables pricing fields when isOverride is false', () => {
		render(
			<Harness
				mode="edit"
				initialDraft={{
					...EMPTY_DRAFT,
					id: 'rule-1',
					modelName: 'gpt-4o',
					provider: 'OpenAI',
					isOverride: false,
				}}
			/>,
		);

		expect(screen.getByTestId('drawer-input-cost')).toBeDisabled();
		expect(screen.getByTestId('drawer-output-cost')).toBeDisabled();
	});

	it('enables pricing fields when isOverride is true', () => {
		render(
			<Harness
				mode="edit"
				initialDraft={{
					...EMPTY_DRAFT,
					id: 'rule-1',
					modelName: 'gpt-4o',
					provider: 'OpenAI',
					isOverride: true,
				}}
			/>,
		);

		expect(screen.getByTestId('drawer-input-cost')).not.toBeDisabled();
		expect(screen.getByTestId('drawer-output-cost')).not.toBeDisabled();
	});

	it('disables the Provider select in Edit mode but allows it in Add mode', () => {
		const { unmount } = render(<Harness mode="add" />);

		expect(screen.getByTestId('drawer-provider-select')).not.toHaveAttribute(
			'data-disabled',
		);
		unmount();

		render(
			<Harness
				mode="edit"
				initialDraft={{
					...EMPTY_DRAFT,
					id: 'rule-1',
					modelName: 'gpt-4o',
					provider: 'OpenAI',
					isOverride: true,
				}}
			/>,
		);

		expect(screen.getByTestId('drawer-provider-select')).toHaveAttribute(
			'data-disabled',
		);
	});

	it('keeps metadata editable but locks pricing when source is auto-populated', () => {
		render(
			<Harness
				mode="add"
				initialDraft={{ ...EMPTY_DRAFT, modelName: 'gpt-4o', isOverride: false }}
			/>,
		);

		// Metadata stays editable while the rule is auto-populated…
		expect(screen.getByTestId('drawer-model-id-input')).not.toBeDisabled();
		// …but pricing is read-only until "User override" is chosen.
		expect(screen.getByTestId('drawer-input-cost')).toBeDisabled();
	});

	it('shows a reset confirmation when switching from Override to Auto', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(
			<Harness
				initialDraft={{
					...EMPTY_DRAFT,
					modelName: 'gpt-4o',
					isOverride: true,
				}}
			/>,
		);

		await user.click(screen.getByTestId('drawer-source-auto'));

		expect(screen.getByTestId('drawer-reset-confirm-btn')).toBeInTheDocument();
		expect(screen.getByTestId('drawer-reset-keep-btn')).toBeInTheDocument();
	});

	it('hides the Delete action in Add mode', () => {
		render(<Harness mode="add" />);
		expect(screen.queryByTestId('drawer-delete-btn')).not.toBeInTheDocument();
	});

	it('shows the Delete action in Edit mode', () => {
		render(
			<Harness
				mode="edit"
				initialDraft={{
					...EMPTY_DRAFT,
					id: 'rule-1',
					modelName: 'gpt-4o',
					isOverride: true,
				}}
			/>,
		);
		expect(screen.getByTestId('drawer-delete-btn')).toBeInTheDocument();
	});

	it('calls onSave when the Save button is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onSave = jest.fn();
		render(<Harness onSave={onSave} />);

		await user.click(screen.getByTestId('drawer-save-btn'));
		expect(onSave).toHaveBeenCalledTimes(1);
	});

	it('is read-only when the user cannot manage pricing (hides Save/Delete)', () => {
		render(
			<Harness
				mode="edit"
				canManage={false}
				initialDraft={{
					...EMPTY_DRAFT,
					id: 'rule-1',
					modelName: 'gpt-4o',
					isOverride: true,
				}}
			/>,
		);

		expect(screen.queryByTestId('drawer-save-btn')).not.toBeInTheDocument();
		expect(screen.queryByTestId('drawer-delete-btn')).not.toBeInTheDocument();
		expect(screen.getByTestId('drawer-model-id-input')).toBeDisabled();
	});
});
