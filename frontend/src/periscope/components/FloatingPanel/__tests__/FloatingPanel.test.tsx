import { act, render, screen, userEvent } from 'tests/test-utils';

import FloatingPanel from '../FloatingPanel';
import type { FloatingObstacle, FloatingRect } from '../types';

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
		// react-rnd offsets its position by this box on mount; jsdom's all-zero box doubles it.
		jest
			.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
			.mockImplementation(function getBoundingClientRect(this: HTMLElement) {
				const [, x = '0', y = '0'] =
					/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(this.style.transform) ??
					[];
				return new DOMRect(
					Number(x),
					Number(y),
					this.offsetWidth,
					this.offsetHeight,
				);
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

	it('keeps the grabbed point under the pointer after pushing past an edge', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setViewport(1280, 800);
		render(
			<FloatingPanel
				isOpen
				width={PANEL_WIDTH}
				height={PANEL_HEIGHT}
				defaultPosition={{ x: 400, y: 100 }}
			>
				<div className="floating-panel__drag-handle" data-testid="panel-handle" />
			</FloatingPanel>,
		);

		// user-event only sees a move when `x`/`y` change, so they're set alongside `clientX`/`clientY`.
		await user.pointer([
			{
				keys: '[MouseLeft>]',
				target: screen.getByTestId('panel-handle'),
				coords: { x: 450, y: 110, clientX: 450, clientY: 110 },
			},
			// 60px past the top edge, then back below where the grab started.
			{ coords: { x: 450, y: -50, clientX: 450, clientY: -50 } },
			{ coords: { x: 450, y: 160, clientX: 450, clientY: 160 } },
			{ keys: '[/MouseLeft]' },
		]);

		expect(getPanelBox()).toStrictEqual({
			x: 400,
			y: 150,
			width: PANEL_WIDTH,
			height: PANEL_HEIGHT,
		});
	});

	describe('avoid', () => {
		const HOME = { x: 852, y: 167 };
		const SUPPORT_CHAT: FloatingRect = {
			x: 882,
			y: 286,
			width: 384,
			height: 478,
		};
		// 8px gap left of the support chat: 882 - 8 - 420.
		const CLEAR_OF_SUPPORT_CHAT = { x: 454, y: 167 };

		function createObstacle(rect: FloatingRect): {
			obstacle: FloatingObstacle;
			show: () => void;
			hide: () => void;
		} {
			let isShown = false;
			const listeners = new Set<() => void>();
			const setShown = (shown: boolean): void => {
				isShown = shown;
				act(() => listeners.forEach((listener) => listener()));
			};
			return {
				obstacle: {
					getRect: (): FloatingRect | null => (isShown ? rect : null),
					subscribe: (onChange): (() => void) => {
						listeners.add(onChange);
						return (): void => {
							listeners.delete(onChange);
						};
					},
				},
				show: (): void => setShown(true),
				hide: (): void => setShown(false),
			};
		}

		function renderPanel(avoid: FloatingObstacle[]): void {
			render(
				<FloatingPanel
					isOpen
					width={PANEL_WIDTH}
					height={PANEL_HEIGHT}
					defaultPosition={HOME}
					avoid={avoid}
				>
					<div className="floating-panel__drag-handle" data-testid="panel-handle" />
				</FloatingPanel>,
			);
		}

		function getPanelPosition(): { x: number; y: number } {
			const { x, y } = getPanelBox();
			return { x, y };
		}

		beforeEach(() => setViewport(1280, 800));

		it('slides left of an obstacle while it shows, and back once it hides', () => {
			const supportChat = createObstacle(SUPPORT_CHAT);
			renderPanel([supportChat.obstacle]);

			supportChat.show();

			expect(getPanelPosition()).toStrictEqual(CLEAR_OF_SUPPORT_CHAT);

			supportChat.hide();

			expect(getPanelPosition()).toStrictEqual(HOME);
		});

		it('stays where the user dragged it while the obstacle showed', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const supportChat = createObstacle(SUPPORT_CHAT);
			renderPanel([supportChat.obstacle]);
			supportChat.show();

			// user-event only sees a move when `x`/`y` change, so they're set alongside `clientX`/`clientY`.
			await user.pointer([
				{
					keys: '[MouseLeft>]',
					target: screen.getByTestId('panel-handle'),
					coords: { x: 500, y: 200, clientX: 500, clientY: 200 },
				},
				{ coords: { x: 346, y: 153, clientX: 346, clientY: 153 } },
				{ keys: '[/MouseLeft]' },
			]);
			supportChat.hide();

			expect(getPanelPosition()).toStrictEqual({ x: 300, y: 120 });
		});

		it('slides past every obstacle in the way', () => {
			const supportChat = createObstacle(SUPPORT_CHAT);
			const widget = createObstacle({ x: 500, y: 200, width: 300, height: 200 });
			renderPanel([supportChat.obstacle, widget.obstacle]);
			widget.show();

			supportChat.show();

			// 882 - 8 - 420 = 454 still hits the widget, so 500 - 8 - 420.
			expect(getPanelPosition()).toStrictEqual({ x: 72, y: 167 });
		});

		it('slides clear of an obstacle already showing when it opens', () => {
			const supportChat = createObstacle(SUPPORT_CHAT);
			supportChat.show();

			renderPanel([supportChat.obstacle]);

			expect(getPanelPosition()).toStrictEqual(CLEAR_OF_SUPPORT_CHAT);
		});
	});
});
