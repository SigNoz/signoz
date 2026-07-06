import { render, screen, userEvent } from 'tests/test-utils';

import AttributeMappingHeader from '../AttributeMappingHeader';

describe('AttributeMappingHeader', () => {
	it('renders the description copy', () => {
		render(
			<AttributeMappingHeader
				isDirty={false}
				isSaving={false}
				onDiscard={jest.fn()}
				onSave={jest.fn()}
			/>,
		);

		expect(
			screen.getByText(
				'Configure source-to-target attribute remapping for LLM traces',
			),
		).toBeInTheDocument();
	});

	it('hides the unsaved-changes indicator and disables Save/Discard when not dirty', () => {
		render(
			<AttributeMappingHeader
				isDirty={false}
				isSaving={false}
				onDiscard={jest.fn()}
				onSave={jest.fn()}
			/>,
		);

		expect(screen.queryByTestId('unsaved-changes')).not.toBeInTheDocument();
		expect(screen.getByTestId('discard-changes-btn')).toBeDisabled();
		expect(screen.getByTestId('save-changes-btn')).toBeDisabled();
	});

	it('shows the unsaved-changes indicator and enables Save/Discard when dirty', () => {
		render(
			<AttributeMappingHeader
				isDirty
				isSaving={false}
				onDiscard={jest.fn()}
				onSave={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('unsaved-changes')).toHaveTextContent(
			'Unsaved changes',
		);
		expect(screen.getByTestId('discard-changes-btn')).toBeEnabled();
		expect(screen.getByTestId('save-changes-btn')).toBeEnabled();
	});

	it('disables Save/Discard and shows the saving label while saving', () => {
		render(
			<AttributeMappingHeader
				isDirty
				isSaving
				onDiscard={jest.fn()}
				onSave={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('discard-changes-btn')).toBeDisabled();
		expect(screen.getByTestId('save-changes-btn')).toBeDisabled();
		expect(screen.getByTestId('save-changes-btn')).toHaveTextContent('Saving…');
	});

	it('calls onSave and onDiscard when their buttons are clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onSave = jest.fn();
		const onDiscard = jest.fn();
		render(
			<AttributeMappingHeader
				isDirty
				isSaving={false}
				onDiscard={onDiscard}
				onSave={onSave}
			/>,
		);

		await user.click(screen.getByTestId('save-changes-btn'));
		await user.click(screen.getByTestId('discard-changes-btn'));

		expect(onSave).toHaveBeenCalledTimes(1);
		expect(onDiscard).toHaveBeenCalledTimes(1);
	});
});
