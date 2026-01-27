import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';

import OverflowInputToolTip from './OverflowInputToolTip';

const TOOLTIP_INNER_SELECTOR = '.ant-tooltip-inner';
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

function queryTooltipInner(): HTMLElement | null {
	// find element that has role="tooltip" (could be the inner itself)
	const tooltip = document.querySelector<HTMLElement>('[role="tooltip"]');
	if (!tooltip) {
		return document.querySelector(TOOLTIP_INNER_SELECTOR);
	}

	// if the role element is already the inner, return it; otherwise return its descendant
	if (tooltip.classList.contains('ant-tooltip-inner')) {
		return tooltip;
	}
	return (
		(tooltip.querySelector(TOOLTIP_INNER_SELECTOR) as HTMLElement) ??
		document.querySelector(TOOLTIP_INNER_SELECTOR)
	);
}

describe('OverflowInputToolTip', () => {
	beforeEach(() => {
		jest.restoreAllMocks();
	});

	test('shows tooltip when content overflows and input is clamped at maxAutoWidth', async () => {
		mockOverflow(150, 250); // clientWidth >= maxAutoWidth (150), scrollWidth > clientWidth

		render(<OverflowInputToolTip value="Very long overflowing text" />);

		await userEvent.hover(screen.getByRole('textbox'));

		await waitFor(() => {
			expect(queryTooltipInner()).not.toBeNull();
		});

		const tooltipInner = queryTooltipInner();
		if (!tooltipInner) {
			throw new Error('Tooltip inner not found');
		}
		expect(
			within(tooltipInner).getByText('Very long overflowing text'),
		).toBeInTheDocument();
	});

	test('does NOT show tooltip when content does not overflow', async () => {
		mockOverflow(150, 100); // content fits (scrollWidth <= clientWidth)

		render(<OverflowInputToolTip value="Short text" />);

		await userEvent.hover(screen.getByRole('textbox'));

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

	test('renders mirror span and input correctly (structural assertions instead of snapshot)', () => {
		const { container } = render(<OverflowInputToolTip value="Snapshot" />);
		const mirror = container.querySelector('.overflow-input-mirror');
		const input = container.querySelector('input') as HTMLInputElement | null;

		expect(mirror).toBeTruthy();
		expect(mirror?.textContent).toBe('Snapshot');
		expect(input).toBeTruthy();
		expect(input?.value).toBe('Snapshot');

		// width should be set inline (component calculates width on mount)
		expect(input?.getAttribute('style')).toContain('width:');
	});
});
