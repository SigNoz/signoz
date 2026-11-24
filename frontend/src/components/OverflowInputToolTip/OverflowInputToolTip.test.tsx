import { act, render, screen, userEvent, within } from 'tests/test-utils';

import OverflowInputToolTip from './OverflowInputToolTip';

// Utility to mock overflow behaviour on inputs / elements.
// Stubs HTMLElement.prototype.clientWidth, scrollWidth and offsetWidth used by component.
function mockOverflow(clientWidth: number, scrollWidth: number): void {
	Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
		configurable: true,
		value: clientWidth,
	});
	Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
		configurable: true,
		value: scrollWidth,
	});
	// mirror.offsetWidth is used to compute mirrorWidth = offsetWidth + 24.
	// Use clientWidth so the mirror measurement aligns with the mocked client width in tests.
	Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
		configurable: true,
		value: clientWidth,
	});
}

const ANTD_TOOLTIP_OPEN_DELAY_MS = 100;

async function hoverPastOpenDelay(element: HTMLElement): Promise<void> {
	jest.useFakeTimers();
	const user = userEvent.setup({
		advanceTimers: (ms) => jest.advanceTimersByTime(ms),
	});
	await user.hover(element);
	act(() => {
		jest.advanceTimersByTime(ANTD_TOOLTIP_OPEN_DELAY_MS * 2);
	});
}

describe('OverflowInputToolTip', () => {
	beforeEach(() => {
		jest.restoreAllMocks();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('shows tooltip when content overflows and input is clamped at maxAutoWidth', async () => {
		mockOverflow(150, 250); // clientWidth >= maxAutoWidth (150), scrollWidth > clientWidth

		render(<OverflowInputToolTip value="Very long overflowing text" />);

		await userEvent.hover(screen.getByRole('textbox'));

		const tooltip = await screen.findByRole('tooltip');
		expect(
			within(tooltip).getByText('Very long overflowing text'),
		).toBeInTheDocument();
	});

	it('does NOT show tooltip when content does not overflow', async () => {
		mockOverflow(150, 100); // content fits (scrollWidth <= clientWidth)

		render(<OverflowInputToolTip value="Short text" />);

		await hoverPastOpenDelay(screen.getByRole('textbox'));

		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
	});

	it('does NOT show tooltip when content overflows but input is NOT at maxAutoWidth', async () => {
		mockOverflow(100, 250); // clientWidth < maxAutoWidth (150), scrollWidth > clientWidth

		render(<OverflowInputToolTip value="Long but input not clamped" />);

		await hoverPastOpenDelay(screen.getByRole('textbox'));

		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
	});

	it('uncontrolled input allows typing', async () => {
		render(<OverflowInputToolTip defaultValue="Init" />);

		const input = screen.getByRole('textbox') as HTMLInputElement;
		await userEvent.type(input, 'ABC');

		expect(input).toHaveValue('InitABC');
	});

	it('disabled input never shows tooltip even if overflowing', async () => {
		mockOverflow(150, 300);

		render(<OverflowInputToolTip value="Overflowing!" disabled />);

		await hoverPastOpenDelay(screen.getByRole('textbox'));

		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
	});

	it('renders mirror span and input correctly (structural assertions instead of snapshot)', () => {
		render(<OverflowInputToolTip value="Snapshot" />);
		const mirror = screen.getByTestId('overflow-input-mirror');
		const input = screen.getByRole('textbox');

		expect(mirror.textContent).toBe('Snapshot');
		expect(input).toHaveValue('Snapshot');

		// width should be set inline (component calculates width on mount)
		expect(input.getAttribute('style')).toContain('width:');
	});
});
