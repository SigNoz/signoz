import { render, screen, userEvent } from 'tests/test-utils';

import { HavingFilterTag } from '../HavingFilterTag';

// Badge renders its suffix inside an aria-hidden span.
const getRemoveButton = (): HTMLElement =>
	screen.getByRole('button', { name: 'Remove', hidden: true });

function renderTag(closable: boolean): {
	onClose: jest.Mock;
	onUpdate: jest.Mock;
} {
	const onClose = jest.fn();
	const onUpdate = jest.fn();
	render(
		<HavingFilterTag
			label="count() > 5"
			value="count() > 5"
			disabled={false}
			closable={closable}
			onClose={onClose}
			onUpdate={onUpdate}
		/>,
	);
	return { onClose, onUpdate };
}

describe('HavingFilterTag', () => {
	it('calls onClose once when the remove button is clicked', async () => {
		const { onClose, onUpdate } = renderTag(true);

		await userEvent.click(getRemoveButton());

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onUpdate).not.toHaveBeenCalled();
	});

	it('renders no remove button when not closable', () => {
		renderTag(false);

		expect(
			screen.queryByRole('button', { name: 'Remove', hidden: true }),
		).not.toBeInTheDocument();
	});

	it('calls onUpdate with the value when the chip body is clicked', async () => {
		const { onClose, onUpdate } = renderTag(true);

		await userEvent.click(screen.getByText('count() > 5'));

		expect(onUpdate).toHaveBeenCalledTimes(1);
		expect(onUpdate).toHaveBeenCalledWith('count() > 5');
		expect(onClose).not.toHaveBeenCalled();
	});
});
