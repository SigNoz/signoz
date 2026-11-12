import { act, render, screen } from 'tests/test-utils';

import FloatingPanel from '../FloatingPanel';

const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 601;

function setViewport(width: number, height: number): void {
	Object.defineProperty(window, 'innerWidth', {
		configurable: true,
		value: width,
	});
	Object.defineProperty(window, 'innerHeight', {
		configurable: true,
		value: height,
	});
}

// jsdom has no layout, so the box is read back from the styles react-rnd writes.
function getPanelBox(): {
	x: number;
	y: number;
	width: number;
	height: number;
} {
	const panel = document.querySelector<HTMLElement>('.floating-panel');
	const [, x, y] =
		/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(
			panel?.style.transform ?? '',
		) ?? [];
	return {
		x: Number(x),
		y: Number(y),
		width: parseFloat(panel?.style.width ?? ''),
		height: parseFloat(panel?.style.height ?? ''),
	};
}

describe('FloatingPanel', () => {
	const originalWidth = window.innerWidth;
	const originalHeight = window.innerHeight;

	beforeEach(() => {
		jest
			.spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
			.mockImplementation(function offsetWidth(this: HTMLElement) {
				return parseFloat(this.style.width) || 0;
			});
		jest
			.spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
			.mockImplementation(function offsetHeight(this: HTMLElement) {
				return parseFloat(this.style.height) || 0;
			});
	});

	afterEach(() => {
		jest.restoreAllMocks();
		setViewport(originalWidth, originalHeight);
	});

	it('keeps its header and input on screen when the window shrinks', () => {
		setViewport(1920, 1080);
		render(
			<FloatingPanel
				isOpen
				keepInViewport
				width={PANEL_WIDTH}
				height={PANEL_HEIGHT}
				minWidth={380}
				minHeight={500}
				defaultPosition={{ x: 1492, y: 447 }}
			>
				<div className="floating-panel__drag-handle">
					<button type="button" data-testid="panel-close">
						Close
					</button>
				</div>
				<textarea data-testid="panel-composer" />
			</FloatingPanel>,
		);

		setViewport(1280, 450);
		act(() => {
			window.dispatchEvent(new Event('resize'));
		});

		expect(getPanelBox()).toStrictEqual({
			x: 860,
			y: 0,
			width: 420,
			height: 450,
		});
		expect(screen.getByTestId('panel-close')).toBeInTheDocument();
		expect(screen.getByTestId('panel-composer')).toBeInTheDocument();
	});
});
