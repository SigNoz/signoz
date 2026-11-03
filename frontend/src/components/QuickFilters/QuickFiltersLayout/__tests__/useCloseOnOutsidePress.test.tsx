import { createPortal } from 'react-dom';
import { render, screen, userEvent } from 'tests/test-utils';

import { useCloseOnOutsidePress } from '../useCloseOnOutsidePress';

function Harness({
	enabled,
	onClose,
}: {
	enabled: boolean;
	onClose: () => void;
}): JSX.Element {
	const markInside = useCloseOnOutsidePress(enabled, onClose);

	return (
		<>
			<div onPointerDownCapture={markInside}>
				<button type="button" data-testid="inside">
					inside
				</button>
				{createPortal(
					<button type="button" data-testid="portal">
						menu item
					</button>,
					document.body,
				)}
			</div>
			<button type="button" data-testid="outside">
				outside
			</button>
		</>
	);
}

describe('useCloseOnOutsidePress', () => {
	it('closes on a press outside', async () => {
		const onClose: jest.MockedFunction<() => void> = jest.fn();
		render(<Harness enabled onClose={onClose} />);

		await userEvent.click(screen.getByTestId('outside'));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('stays open on a press inside, including a portal rendered from inside', async () => {
		const onClose: jest.MockedFunction<() => void> = jest.fn();
		render(<Harness enabled onClose={onClose} />);

		await userEvent.click(screen.getByTestId('inside'));
		await userEvent.click(screen.getByTestId('portal'));

		expect(onClose).not.toHaveBeenCalled();
	});

	it('does nothing while disabled', async () => {
		const onClose: jest.MockedFunction<() => void> = jest.fn();
		render(<Harness enabled={false} onClose={onClose} />);

		await userEvent.click(screen.getByTestId('outside'));

		expect(onClose).not.toHaveBeenCalled();
	});
});
