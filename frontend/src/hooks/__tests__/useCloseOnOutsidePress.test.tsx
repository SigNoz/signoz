import { createPortal } from 'react-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useCloseOnOutsidePress } from '../useCloseOnOutsidePress';

function Harness({
	enabled = true,
	onClose,
}: {
	enabled?: boolean;
	onClose: () => void;
}): JSX.Element {
	const onPressInside = useCloseOnOutsidePress(enabled, onClose);
	return (
		<>
			<div onPointerDownCapture={onPressInside}>
				<button type="button" data-testid="inside">
					inside
				</button>
				<button
					type="button"
					data-testid="inside-stops"
					onPointerDown={(e): void => e.stopPropagation()}
				>
					inside, stops propagation
				</button>
				{createPortal(
					<button type="button" data-testid="inside-portal">
						portal
					</button>,
					document.body,
				)}
			</div>
			<button type="button" data-testid="outside">
				outside
			</button>
			<button
				type="button"
				data-testid="outside-stops"
				onPointerDown={(e): void => e.stopPropagation()}
			>
				outside, stops propagation
			</button>
		</>
	);
}

const flush = (): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve);
	});

describe('useCloseOnOutsidePress', () => {
	it('closes on a press outside', async () => {
		const onClose = jest.fn();
		render(<Harness onClose={onClose} />);

		await userEvent.click(screen.getByTestId('outside'));
		await flush();

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('stays open on a press inside, portals included', async () => {
		const onClose = jest.fn();
		render(<Harness onClose={onClose} />);

		await userEvent.click(screen.getByTestId('inside'));
		await userEvent.click(screen.getByTestId('inside-portal'));
		await flush();

		expect(onClose).not.toHaveBeenCalled();
	});

	it('closes when the outside element stops propagation', async () => {
		const onClose = jest.fn();
		render(<Harness onClose={onClose} />);

		await userEvent.click(screen.getByTestId('outside-stops'));
		await flush();

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('closes on the first outside press after an inside press stops propagation', async () => {
		const onClose = jest.fn();
		render(<Harness onClose={onClose} />);

		await userEvent.click(screen.getByTestId('inside-stops'));
		await flush();
		expect(onClose).not.toHaveBeenCalled();

		await userEvent.click(screen.getByTestId('outside'));
		await flush();
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('does nothing while disabled', async () => {
		const onClose = jest.fn();
		render(<Harness enabled={false} onClose={onClose} />);

		await userEvent.click(screen.getByTestId('outside'));
		await flush();

		expect(onClose).not.toHaveBeenCalled();
	});
});
