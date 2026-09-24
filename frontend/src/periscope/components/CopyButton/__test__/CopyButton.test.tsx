import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CopyButton from '../CopyButton';

const mockCopy = jest.fn();

// Exercise the real useCopyButton — stub only react-use's underlying copy so the
// click doesn't hit copy-to-clipboard's jsdom fallback (window.prompt).
jest.mock('react-use', () => ({
	...jest.requireActual('react-use'),
	useCopyToClipboard: (): [unknown, jest.Mock] => [null, mockCopy],
}));

describe('CopyButton', () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		jest.useFakeTimers();
		user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
		mockCopy.mockClear();
	});

	afterEach(() => {
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	});

	it('copies its value on click', async () => {
		render(<CopyButton value="hello" testId="copy" />);

		await user.click(screen.getByTestId('copy'));

		expect(mockCopy).toHaveBeenCalledWith('hello');
	});

	it('does not trigger parent click handlers (stops propagation)', async () => {
		const onParentClick = jest.fn();
		render(
			// oxlint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
			<div onClick={onParentClick}>
				<CopyButton value="x" testId="copy" />
			</div>,
		);

		await user.click(screen.getByTestId('copy'));

		expect(onParentClick).not.toHaveBeenCalled();
	});

	it('shows the copied state after clicking and reverts after the reset window', async () => {
		const { container } = render(<CopyButton value="hello" testId="copy" />);
		const iconStack = container.querySelector('[data-copied]') as HTMLElement;

		expect(iconStack).toHaveAttribute('data-copied', 'false');

		await user.click(screen.getByTestId('copy'));
		expect(iconStack).toHaveAttribute('data-copied', 'true');

		act(() => {
			jest.runOnlyPendingTimers();
		});
		expect(iconStack).toHaveAttribute('data-copied', 'false');
	});
});
