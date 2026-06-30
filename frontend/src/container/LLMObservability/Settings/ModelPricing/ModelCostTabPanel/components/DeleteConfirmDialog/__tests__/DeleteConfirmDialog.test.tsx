import { render, screen, userEvent } from 'tests/test-utils';

import DeleteConfirmDialog from '../DeleteConfirmDialog';

describe('DeleteConfirmDialog', () => {
	it('renders the model name in the confirmation copy', () => {
		render(
			<DeleteConfirmDialog
				open
				modelName="gpt-4o"
				isDeleting={false}
				onConfirm={jest.fn()}
				onCancel={jest.fn()}
			/>,
		);

		expect(screen.getByText('gpt-4o')).toBeInTheDocument();
	});

	it('calls onConfirm when the confirm button is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onConfirm = jest.fn();
		render(
			<DeleteConfirmDialog
				open
				modelName="gpt-4o"
				isDeleting={false}
				onConfirm={onConfirm}
				onCancel={jest.fn()}
			/>,
		);

		await user.click(screen.getByTestId('drawer-delete-confirm-btn'));

		expect(onConfirm).toHaveBeenCalledTimes(1);
	});

	it('calls onCancel when the cancel button is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onCancel = jest.fn();
		render(
			<DeleteConfirmDialog
				open
				modelName="gpt-4o"
				isDeleting={false}
				onConfirm={jest.fn()}
				onCancel={onCancel}
			/>,
		);

		await user.click(screen.getByTestId('drawer-delete-cancel-btn'));

		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it('disables the confirm button while deleting', () => {
		render(
			<DeleteConfirmDialog
				open
				modelName="gpt-4o"
				isDeleting
				onConfirm={jest.fn()}
				onCancel={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('drawer-delete-confirm-btn')).toBeDisabled();
	});

	it('calls onCancel when the dialog is dismissed via Escape', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onCancel = jest.fn();
		render(
			<DeleteConfirmDialog
				open
				modelName="gpt-4o"
				isDeleting={false}
				onConfirm={jest.fn()}
				onCancel={onCancel}
			/>,
		);

		await user.keyboard('{Escape}');

		expect(onCancel).toHaveBeenCalledTimes(1);
	});
});
