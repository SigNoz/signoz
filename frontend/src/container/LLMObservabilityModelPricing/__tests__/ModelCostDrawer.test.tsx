import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen } from 'tests/test-utils';

import { EMPTY_DRAFT, type DrawerDraft } from '../drawerUtils';
import ModelCostDrawer from '../ModelCostDrawer';

interface HarnessProps {
	initialDraft?: DrawerDraft;
	mode?: 'add' | 'edit';
	onSave?: () => void;
	onDelete?: () => void;
}

function Harness({
	initialDraft = { ...EMPTY_DRAFT, modelName: 'gpt-4o' },
	mode = 'add',
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

	it('shows a match result when the test input matches an existing pattern', () => {
		render(
			<Harness
				initialDraft={{
					...EMPTY_DRAFT,
					modelName: 'gpt-4o',
					patterns: ['gpt-4o'],
					isOverride: true,
				}}
			/>,
		);

		fireEvent.change(screen.getByTestId('drawer-pattern-test-input'), {
			target: { value: 'gpt-4o-2024-08-06' },
		});

		expect(screen.getByTestId('drawer-pattern-test-result')).toHaveTextContent(
			/matched: gpt-4o\*/i,
		);
	});

	it('shows a no-match result when nothing matches', () => {
		render(
			<Harness
				initialDraft={{
					...EMPTY_DRAFT,
					modelName: 'gpt-4o',
					patterns: ['gpt-4o'],
					isOverride: true,
				}}
			/>,
		);

		fireEvent.change(screen.getByTestId('drawer-pattern-test-input'), {
			target: { value: 'claude' },
		});

		expect(screen.getByTestId('drawer-pattern-test-result')).toHaveTextContent(
			/no matching pattern/i,
		);
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
});
