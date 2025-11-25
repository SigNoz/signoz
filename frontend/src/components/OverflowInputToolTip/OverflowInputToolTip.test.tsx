import { InputRef } from 'antd';
import React from 'react';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import OverflowInputToolTip from './OverflowInputToolTip';

// Utility to mock overflow behavior
function mockOverflow(width: number, scrollWidth: number): void {
	Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
		configurable: true,
		value: width,
	});
	Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
		configurable: true,
		value: scrollWidth,
	});
}

describe('OverflowTooltipInput', () => {
	beforeEach(() => {
		jest.restoreAllMocks();
	});

	test('shows tooltip on overflow', async () => {
		mockOverflow(50, 150);

		render(<OverflowInputToolTip value="Long overflowing text" />);

		await userEvent.hover(screen.getByRole('textbox'));

		expect(await screen.findByText('Long overflowing text')).toBeInTheDocument();
	});

	test('does NOT show tooltip when not overflowing', async () => {
		mockOverflow(150, 100);

		render(<OverflowInputToolTip value="Short text" />);

		await userEvent.hover(screen.getByRole('textbox'));

		await waitFor(() => {
			expect(screen.queryByText('Short text')).not.toBeInTheDocument();
		});
	});

	test('uncontrolled input allows typing', async () => {
		render(<OverflowInputToolTip defaultValue="Init" />);

		const input = screen.getByRole('textbox');
		await userEvent.type(input, 'ABC');

		expect(input).toHaveValue('InitABC');
	});

	test('disabled input never shows tooltip', async () => {
		mockOverflow(50, 200);

		render(<OverflowInputToolTip value="Overflowing!" disabled />);

		await userEvent.hover(screen.getByRole('textbox'));

		await waitFor(() => {
			expect(screen.queryByText('Overflowing!')).not.toBeInTheDocument();
		});
	});

	test('ref forwards to actual <input> element', () => {
		const ref = React.createRef<InputRef>();

		render(<OverflowInputToolTip ref={ref} value="Test" />);

		expect(ref.current).not.toBeNull();
		expect(ref.current?.input?.tagName).toBe('INPUT');
	});

	test('ref forwards when no props', () => {
		const ref = React.createRef<InputRef>();

		render(<OverflowInputToolTip ref={ref} />);

		expect(ref.current).not.toBeNull();
		expect(ref.current?.input?.tagName).toBe('INPUT');
	});

	test('matches snapshot', () => {
		const { container } = render(<OverflowInputToolTip value="Snapshot" />);
		expect(container).toMatchSnapshot();
	});
});
