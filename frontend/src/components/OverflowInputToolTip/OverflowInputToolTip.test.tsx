import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';

import OverflowInputToolTip from './OverflowInputToolTip';

// Utility to mock overflow behaviour on inputs / elements.
// Stubs HTMLElement.prototype.clientWidth and scrollWidth used by component.
function mockOverflow(clientWidth: number, scrollWidth: number): void {
	Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
		configurable: true,
		value: clientWidth,
	});
	Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
		configurable: true,
		value: scrollWidth,
	});
}

function queryTooltipInner(): HTMLElement | null {
	const tooltip = document.querySelector('[role="tooltip"]');
	if (tooltip)
		return tooltip.querySelector('.ant-tooltip-inner') as HTMLElement | null;
	return document.querySelector('.ant-tooltip-inner');
}

describe('OverflowInputToolTip', () => {
	beforeEach(() => {
		jest.restoreAllMocks();
	});

	test('shows tooltip when content overflows and input is clamped at maxAutoWidth', async () => {
		mockOverflow(150, 250); // clientWidth >= maxAutoWidth (150), scrollWidth > clientWidth

		render(<OverflowInputToolTip value="Very long overflowing text" />);

		await userEvent.hover(screen.getByRole('textbox'));

		// Wait for the tooltip wrapper to appear, then assert its content via within()
		const tooltipWrapper = await screen.findByRole('tooltip');
		expect(tooltipWrapper).toBeInTheDocument();
		expect(
			within(tooltipWrapper).getByText('Very long overflowing text'),
		).toBeInTheDocument();
	});

	test('does NOT show tooltip when content does not overflow', async () => {
		mockOverflow(150, 100); // content fits (scrollWidth <= clientWidth)

		render(<OverflowInputToolTip value="Short text" />);

		await userEvent.hover(screen.getByRole('textbox'));

		// There should be no tooltip element rendered with content
		await waitFor(() => {
			expect(queryTooltipInner()).toBeNull();
		});
	});

	test('does NOT show tooltip when content overflows but input is NOT at maxAutoWidth', async () => {
		mockOverflow(100, 250); // clientWidth < maxAutoWidth (150), scrollWidth > clientWidth

		render(<OverflowInputToolTip value="Long but input not clamped" />);

		await userEvent.hover(screen.getByRole('textbox'));

		await waitFor(() => {
			expect(queryTooltipInner()).toBeNull();
		});
	});

	test('uncontrolled input allows typing', async () => {
		render(<OverflowInputToolTip defaultValue="Init" />);

		const input = screen.getByRole('textbox') as HTMLInputElement;
		await userEvent.type(input, 'ABC');

		expect(input).toHaveValue('InitABC');
	});

	test('disabled input never shows tooltip even if overflowing', async () => {
		mockOverflow(150, 300);

		render(<OverflowInputToolTip value="Overflowing!" disabled />);

		await userEvent.hover(screen.getByRole('textbox'));

		await waitFor(() => {
			expect(queryTooltipInner()).toBeNull();
		});
	});

	test('matches snapshot', () => {
		const { container } = render(<OverflowInputToolTip value="Snapshot" />);
		expect(container).toMatchSnapshot();
	});
});
