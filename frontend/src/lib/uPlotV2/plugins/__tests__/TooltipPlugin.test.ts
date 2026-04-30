import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from 'tests/test-utils';
import type uPlot from 'uplot';

import { TooltipRenderArgs } from '../../components/types';
import { UPlotConfigBuilder } from '../../config/UPlotConfigBuilder';
import TooltipPlugin from '../TooltipPlugin/TooltipPlugin';
import {
	DashboardCursorSync,
	DEFAULT_PIN_TOOLTIP_KEY,
} from '../TooltipPlugin/types';

// Avoid depending on the full uPlot + onClickPlugin behaviour in these tests.
// We only care that pinning logic runs without throwing, not which series is focused.
jest.mock('lib/uPlotLib/plugins/onClickPlugin', () => ({
	getFocusedSeriesAtPosition: jest.fn(() => null),
}));

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

type HookHandler = (...args: unknown[]) => void;

class TestConfigBuilder extends UPlotConfigBuilder {
	public registeredHooks: { type: string; handler: HookHandler }[] = [];

	public removeCallbacks: jest.Mock[] = [];

	// Override addHook so we can:
	// - capture handlers by hook name for tests
	// - return removable jest mocks to assert cleanup
	public addHook<T extends keyof uPlot.Hooks.Defs>(
		type: T,
		hook: uPlot.Hooks.Defs[T],
	): () => void {
		this.registeredHooks.push({
			type: String(type),
			handler: hook as HookHandler,
		});
		const remove = jest.fn();
		this.removeCallbacks.push(remove);
		return remove;
	}
}

type ConfigMock = TestConfigBuilder;

function createConfigMock(): ConfigMock {
	return new TestConfigBuilder({ id: 'test-widget' });
}

function getHandler(config: ConfigMock, hookName: string): HookHandler {
	const entry = config.registeredHooks.find((h) => h.type === hookName);
	if (!entry) {
		throw new Error(`Hook "${hookName}" was not registered on config`);
	}
	return entry.handler;
}

function createFakePlot(): {
	over: HTMLDivElement;
	setCursor: jest.Mock<void, [uPlot.Cursor]>;
	cursor: { event: Record<string, unknown>; left: number; top: number };
	posToVal: jest.Mock<number, [value: number]>;
	posToIdx: jest.Mock<number, []>;
	data: [number[], number[]];
} {
	const over = document.createElement('div');

	// Provide the minimal uPlot surface used by TooltipPlugin's pin logic.
	return {
		over,
		setCursor: jest.fn(),
		// left / top are set to valid values so keyboard-pin tests do not
		// hit the "cursor off-screen" guard inside handleKeyDown.
		cursor: { event: {}, left: 50, top: 50 },
		// In real uPlot these map overlay coordinates to data-space values.
		posToVal: jest.fn((value: number) => value),
		posToIdx: jest.fn(() => 0),
		data: [[0], [0]],
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TooltipPlugin', () => {
	beforeEach(() => {
		jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
			(callback as FrameRequestCallback)(0);
			return 0;
		});
		jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	/**
	 * Shorthand: render the plugin, initialise a fake plot, and trigger a
	 * series focus so the tooltip becomes visible. Returns the fake plot
	 * instance for further interaction (e.g. clicking the overlay).
	 */
	function renderAndActivateHover(
		config: ConfigMock,
		renderFn: (
			args: TooltipRenderArgs,
		) => React.ReactNode = (): React.ReactNode =>
			React.createElement('div', null, 'tooltip-body'),
		extraProps: Partial<React.ComponentProps<typeof TooltipPlugin>> = {},
	): ReturnType<typeof createFakePlot> {
		render(
			React.createElement(TooltipPlugin, {
				config,
				render: renderFn,
				syncMode: DashboardCursorSync.None,
				...extraProps,
			}),
		);

		const fakePlot = createFakePlot();
		const initHandler = getHandler(config, 'init');
		const setSeriesHandler = getHandler(config, 'setSeries');

		act(() => {
			initHandler(fakePlot);
			setSeriesHandler(fakePlot, 1, { focus: true });
		});

		return fakePlot;
	}

	// ---- Initial state --------------------------------------------------------

	describe('before any interaction', () => {
		it('does not render anything when there is no active hover', () => {
			const config = createConfigMock();

			render(
				React.createElement(TooltipPlugin, {
					config,
					render: () => React.createElement('div', null, 'tooltip-body'),
					syncMode: DashboardCursorSync.None,
				}),
			);

			expect(screen.queryByTestId('tooltip-plugin-container')).toBeNull();
		});

		it('registers all required uPlot hooks on mount', () => {
			const config = createConfigMock();

			render(
				React.createElement(TooltipPlugin, {
					config,
					render: () => null,
					syncMode: DashboardCursorSync.None,
				}),
			);

			const registered = config.registeredHooks.map((h) => h.type);
			expect(registered).toContain('ready');
			expect(registered).toContain('init');
			expect(registered).toContain('setData');
			expect(registered).toContain('setSeries');
			expect(registered).toContain('setLegend');
			expect(registered).toContain('setCursor');
		});
	});

	// ---- Tooltip rendering ------------------------------------------------------

	describe('tooltip rendering', () => {
		it('renders contents into a portal on document.body when hover is active', () => {
			const config = createConfigMock();
			const renderTooltip = jest.fn(() =>
				React.createElement('div', null, 'tooltip-body'),
			);

			renderAndActivateHover(config, renderTooltip);

			expect(renderTooltip).toHaveBeenCalled();
			expect(screen.getByText('tooltip-body')).toBeInTheDocument();

			const container = screen.getByTestId('tooltip-plugin-container');
			expect(container).not.toBeNull();
			expect(container.parentElement).toBe(document.body);
		});

		it('moves tooltip portal root to fullscreen element and back on exit', async () => {
			const config = createConfigMock();
			let mockedFullscreenElement: Element | null = null;
			const originalFullscreenElementDescriptor = Object.getOwnPropertyDescriptor(
				Document.prototype,
				'fullscreenElement',
			);
			Object.defineProperty(Document.prototype, 'fullscreenElement', {
				configurable: true,
				get: () => mockedFullscreenElement,
			});

			renderAndActivateHover(config);

			const container = screen.getByTestId('tooltip-plugin-container');
			expect(container.parentElement).toBe(document.body);

			const fullscreenRoot = document.createElement('div');
			document.body.append(fullscreenRoot);

			act(() => {
				mockedFullscreenElement = fullscreenRoot;
				document.dispatchEvent(new Event('fullscreenchange'));
			});

			await waitFor(() => {
				const updatedContainer = screen.getByTestId('tooltip-plugin-container');
				expect(updatedContainer.parentElement).toBe(fullscreenRoot);
			});

			act(() => {
				mockedFullscreenElement = null;
				document.dispatchEvent(new Event('fullscreenchange'));
			});

			await waitFor(() => {
				const updatedContainer = screen.getByTestId('tooltip-plugin-container');
				expect(updatedContainer.parentElement).toBe(document.body);
			});

			if (originalFullscreenElementDescriptor) {
				Object.defineProperty(
					Document.prototype,
					'fullscreenElement',
					originalFullscreenElementDescriptor,
				);
			}
			fullscreenRoot.remove();
		});
	});

	// ---- Pin behaviour ----------------------------------------------------------

	describe('pin behaviour', () => {
		it('pins the tooltip when canPinTooltip is true and the pinKey is pressed while hovering', () => {
			const config = createConfigMock();

			renderAndActivateHover(config, undefined, { canPinTooltip: true });

			const container = screen.getByTestId('tooltip-plugin-container');
			expect(container.dataset.pinned === 'true').toBe(false);

			act(() => {
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', {
						key: DEFAULT_PIN_TOOLTIP_KEY,
						bubbles: true,
					}),
				);
			});

			return waitFor(() => {
				const updated = screen.getByTestId('tooltip-plugin-container');
				expect(updated).toBeInTheDocument();
				expect(updated.dataset.pinned === 'true').toBe(true);
			});
		});

		it('renders pinnedTooltipElement after pinning and hides hover content', async () => {
			const config = createConfigMock();
			const pinnedTooltipElement = jest.fn(() =>
				React.createElement('div', null, 'pinned-tooltip'),
			);

			renderAndActivateHover(
				config,
				() => React.createElement('div', null, 'hover-tooltip'),
				{
					canPinTooltip: true,
					pinnedTooltipElement,
				},
			);

			expect(screen.getByText('hover-tooltip')).toBeInTheDocument();

			act(() => {
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', {
						key: DEFAULT_PIN_TOOLTIP_KEY,
						bubbles: true,
					}),
				);
			});

			await waitFor(() => {
				expect(pinnedTooltipElement).toHaveBeenCalled();
				expect(screen.getByText('pinned-tooltip')).toBeInTheDocument();
				expect(screen.queryByText('hover-tooltip')).not.toBeInTheDocument();
			});
		});

		it('dismisses a pinned tooltip via the dismiss callback', async () => {
			const config = createConfigMock();

			render(
				React.createElement(TooltipPlugin, {
					config,
					render: (args: TooltipRenderArgs) =>
						React.createElement(
							'button',
							{ type: 'button', onClick: args.dismiss },
							'Dismiss',
						),
					syncMode: DashboardCursorSync.None,
					canPinTooltip: true,
				}),
			);

			const fakePlot = createFakePlot();

			act(() => {
				getHandler(config, 'init')(fakePlot);
				getHandler(config, 'setSeries')(fakePlot, 1, { focus: true });
			});

			// Pin the tooltip via the keyboard shortcut.
			act(() => {
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', {
						key: DEFAULT_PIN_TOOLTIP_KEY,
						bubbles: true,
					}),
				);
			});

			// Wait until the tooltip is actually pinned.
			await waitFor(() => {
				const container = screen.getByTestId('tooltip-plugin-container');
				expect(container.dataset.pinned === 'true').toBe(true);
			});

			const button = await screen.findByRole('button', { name: 'Dismiss' });

			const user = userEvent.setup({ pointerEventsCheck: 0 });
			await user.click(button);

			await waitFor(() => {
				const container = screen.getByTestId('tooltip-plugin-container');

				expect(container).toBeInTheDocument();
				expect(container.getAttribute('aria-hidden')).toBe('true');
				expect(container.dataset.pinned === 'true').toBe(false);
				expect(container.textContent).toBe('');
			});
		});

		it('drops a pinned tooltip when the underlying data changes', () => {
			jest.useFakeTimers();
			const config = createConfigMock();

			render(
				React.createElement(TooltipPlugin, {
					config: config,
					render: () => React.createElement('div', null, 'tooltip-body'),
					syncMode: DashboardCursorSync.None,
					canPinTooltip: true,
				}),
			);

			const fakePlot = createFakePlot();

			act(() => {
				getHandler(config, 'init')(fakePlot);
				getHandler(config, 'setSeries')(fakePlot, 1, { focus: true });
				jest.runAllTimers();
			});

			// Pin via keyboard.
			act(() => {
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', {
						key: DEFAULT_PIN_TOOLTIP_KEY,
						bubbles: true,
					}),
				);
				jest.runAllTimers();
			});

			expect(
				screen.getByTestId('tooltip-plugin-container').dataset.pinned === 'true',
			).toBe(true);

			// Simulate data update – should dismiss the pinned tooltip.
			act(() => {
				getHandler(config, 'setData')(fakePlot);
				jest.runAllTimers();
			});

			const container = screen.getByTestId('tooltip-plugin-container');
			expect(container).toBeInTheDocument();
			expect(container.getAttribute('aria-hidden')).toBe('true');
			expect(container.dataset.pinned === 'true').toBe(false);

			jest.useRealTimers();
		});

		it('unpins the tooltip on outside mousedown', async () => {
			jest.useFakeTimers();
			const config = createConfigMock();

			render(
				React.createElement(TooltipPlugin, {
					config,
					render: () => React.createElement('div', null, 'pinned content'),
					syncMode: DashboardCursorSync.None,
					canPinTooltip: true,
				}),
			);

			const fakePlot = createFakePlot();

			act(() => {
				getHandler(config, 'init')(fakePlot);
				getHandler(config, 'setSeries')(fakePlot, 1, { focus: true });
				jest.runAllTimers();
			});

			// Pin via keyboard.
			act(() => {
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', {
						key: DEFAULT_PIN_TOOLTIP_KEY,
						bubbles: true,
					}),
				);
				jest.runAllTimers();
			});

			expect(
				screen.getByTestId('tooltip-plugin-container').dataset.pinned === 'true',
			).toBe(true);

			// Click outside the tooltip container.
			act(() => {
				document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
				jest.runAllTimers();
			});

			await waitFor(() => {
				const container = screen.getByTestId('tooltip-plugin-container');

				expect(container).toBeInTheDocument();
				expect(container.getAttribute('aria-hidden')).toBe('true');
				expect(container.dataset.pinned === 'true').toBe(false);
			});

			jest.useRealTimers();
		});

		it('unpins the tooltip when Escape is pressed while pinned', async () => {
			jest.useFakeTimers();
			const config = createConfigMock();

			render(
				React.createElement(TooltipPlugin, {
					config,
					render: () => React.createElement('div', null, 'pinned content'),
					syncMode: DashboardCursorSync.None,
					canPinTooltip: true,
				}),
			);

			const fakePlot = createFakePlot();

			act(() => {
				getHandler(config, 'init')(fakePlot);
				getHandler(config, 'setSeries')(fakePlot, 1, { focus: true });
				jest.runAllTimers();
			});

			// Pin via keyboard.
			act(() => {
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', {
						key: DEFAULT_PIN_TOOLTIP_KEY,
						bubbles: true,
					}),
				);
				jest.runAllTimers();
			});

			expect(
				screen.getByTestId('tooltip-plugin-container').dataset.pinned === 'true',
			).toBe(true);

			// Press Escape to release.
			act(() => {
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
				);
				jest.runAllTimers();
			});

			await waitFor(() => {
				const container = screen.getByTestId('tooltip-plugin-container');
				expect(container).toBeInTheDocument();
				expect(container.getAttribute('aria-hidden')).toBe('true');
				expect(container.dataset.pinned === 'true').toBe(false);
			});

			jest.useRealTimers();
		});

		it('unpins the tooltip when the pin key is pressed a second time (toggle off)', async () => {
			jest.useFakeTimers();
			const config = createConfigMock();

			renderAndActivateHover(config, undefined, { canPinTooltip: true });
			jest.runAllTimers();

			// First press — pin.
			act(() => {
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', {
						key: DEFAULT_PIN_TOOLTIP_KEY,
						bubbles: true,
					}),
				);
				jest.runAllTimers();
			});

			await waitFor(() => {
				expect(
					screen.getByTestId('tooltip-plugin-container').dataset.pinned === 'true',
				).toBe(true);
			});

			// Second press — unpin (toggle off).
			act(() => {
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', {
						key: DEFAULT_PIN_TOOLTIP_KEY,
						bubbles: true,
					}),
				);
				jest.runAllTimers();
			});

			await waitFor(() => {
				const container = screen.getByTestId('tooltip-plugin-container');
				expect(container.dataset.pinned === 'true').toBe(false);
			});

			jest.useRealTimers();
		});

		it('does not unpin on Escape when tooltip is not pinned', () => {
			const config = createConfigMock();
			renderAndActivateHover(config, undefined, { canPinTooltip: true });

			// Escape without pinning first — should be a no-op.
			act(() => {
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
				);
			});

			const container = screen.getByTestId('tooltip-plugin-container');
			// Tooltip should still be hovering (visible), not dismissed.
			expect(container.getAttribute('aria-hidden')).toBe('false');
			expect(container.dataset.pinned === 'true').toBe(false);
		});

		it('does not unpin on arbitrary keys that are not Escape or the pin key', async () => {
			jest.useFakeTimers();
			const config = createConfigMock();

			renderAndActivateHover(config, undefined, { canPinTooltip: true });
			jest.runAllTimers();

			// Pin.
			act(() => {
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', {
						key: DEFAULT_PIN_TOOLTIP_KEY,
						bubbles: true,
					}),
				);
				jest.runAllTimers();
			});

			await waitFor(() => {
				expect(
					screen.getByTestId('tooltip-plugin-container').dataset.pinned === 'true',
				).toBe(true);
			});

			// Arrow key — should NOT unpin.
			act(() => {
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
				);
				jest.runAllTimers();
			});

			await waitFor(() => {
				expect(
					screen.getByTestId('tooltip-plugin-container').dataset.pinned === 'true',
				).toBe(true);
			});

			jest.useRealTimers();
		});
	});

	// ---- Keyboard pin edge cases ------------------------------------------------

	describe('keyboard pin edge cases', () => {
		it('does not pin when cursor coordinates are negative (cursor off-screen)', () => {
			const config = createConfigMock();

			render(
				React.createElement(TooltipPlugin, {
					config,
					render: () => React.createElement('div', null, 'tooltip-body'),
					syncMode: DashboardCursorSync.None,
					canPinTooltip: true,
				}),
			);

			// Negative cursor coords — handleKeyDown bails out before pinning.
			const fakePlot = {
				...createFakePlot(),
				cursor: { event: {}, left: -1, top: -1 },
			};

			act(() => {
				getHandler(config, 'init')(fakePlot);
				getHandler(config, 'setSeries')(fakePlot, 1, { focus: true });
			});

			act(() => {
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', {
						key: DEFAULT_PIN_TOOLTIP_KEY,
						bubbles: true,
					}),
				);
			});

			const container = screen.getByTestId('tooltip-plugin-container');
			expect(container.dataset.pinned === 'true').toBe(false);
		});

		it('does not pin when hover is not active', () => {
			const config = createConfigMock();

			render(
				React.createElement(TooltipPlugin, {
					config,
					render: () => React.createElement('div', null, 'tooltip-body'),
					syncMode: DashboardCursorSync.None,
					canPinTooltip: true,
				}),
			);

			const fakePlot = createFakePlot();

			act(() => {
				// Initialise the plot but do NOT call setSeries – hoverActive stays false.
				getHandler(config, 'init')(fakePlot);
			});

			act(() => {
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', {
						key: DEFAULT_PIN_TOOLTIP_KEY,
						bubbles: true,
					}),
				);
			});

			// The container exists once the plot is initialised, but it should
			// be hidden and not pinned since hover was never activated.
			const container = screen.getByTestId('tooltip-plugin-container');
			expect(container.dataset.pinned === 'true').toBe(false);
			expect(container.getAttribute('aria-hidden')).toBe('true');
		});

		it('ignores other keys and only pins on the configured pinKey', async () => {
			const config = createConfigMock();

			renderAndActivateHover(config, undefined, {
				canPinTooltip: true,
				pinKey: 'p',
			});

			// 'l' should NOT pin when pinKey is 'p'.
			act(() => {
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', {
						key: 'l',
						bubbles: true,
					}),
				);
			});

			await waitFor(() => {
				expect(
					screen.getByTestId('tooltip-plugin-container').dataset.pinned === 'true',
				).toBe(false);
			});

			// Custom pin key 'p' SHOULD pin.
			act(() => {
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', { key: 'p', bubbles: true }),
				);
			});

			await waitFor(() => {
				expect(
					screen.getByTestId('tooltip-plugin-container').dataset.pinned === 'true',
				).toBe(true);
			});
		});

		it('does not register a keydown listener when canPinTooltip is false', () => {
			const config = createConfigMock();
			const addSpy = jest.spyOn(document, 'addEventListener');

			render(
				React.createElement(TooltipPlugin, {
					config,
					render: () => null,
					syncMode: DashboardCursorSync.None,
					canPinTooltip: false,
				}),
			);

			const keydownCalls = addSpy.mock.calls.filter(
				([type]) => type === 'keydown',
			);
			expect(keydownCalls).toHaveLength(0);
		});

		it('removes the keydown pin listener on unmount', () => {
			const config = createConfigMock();
			const addSpy = jest.spyOn(document, 'addEventListener');
			const removeSpy = jest.spyOn(document, 'removeEventListener');

			const { unmount } = render(
				React.createElement(TooltipPlugin, {
					config,
					render: () => null,
					syncMode: DashboardCursorSync.None,
					canPinTooltip: true,
				}),
			);

			const pinListenerCall = addSpy.mock.calls.find(
				([type]) => type === 'keydown',
			);
			expect(pinListenerCall).toBeDefined();
			if (!pinListenerCall) {
				return;
			}
			const [, pinListener, pinOptions] = pinListenerCall;

			unmount();

			expect(removeSpy).toHaveBeenCalledWith('keydown', pinListener, pinOptions);
		});
	});

	// ---- Cursor sync ------------------------------------------------------------

	describe('cursor sync', () => {
		it('enables uPlot cursor sync on x-axis only when mode is Tooltip', () => {
			const config = createConfigMock();
			const setCursorSpy = jest.spyOn(config, 'setCursor');
			config.addScale({ scaleKey: 'x', time: true });

			render(
				React.createElement(TooltipPlugin, {
					config,
					render: () => null,
					syncMode: DashboardCursorSync.Tooltip,
					syncKey: 'dashboard-sync',
				}),
			);

			expect(setCursorSpy).toHaveBeenCalledWith({
				sync: { key: 'dashboard-sync', scales: ['x', null] },
			});
		});

		it('enables uPlot cursor sync on both axes when mode is Crosshair', () => {
			const config = createConfigMock();
			const setCursorSpy = jest.spyOn(config, 'setCursor');
			config.addScale({ scaleKey: 'x', time: true });

			render(
				React.createElement(TooltipPlugin, {
					config,
					render: () => null,
					syncMode: DashboardCursorSync.Crosshair,
					syncKey: 'dashboard-sync',
				}),
			);

			expect(setCursorSpy).toHaveBeenCalledWith({
				sync: { key: 'dashboard-sync', scales: ['x', 'y'] },
			});
		});

		it('does not enable cursor sync when mode is None', () => {
			const config = createConfigMock();
			const setCursorSpy = jest.spyOn(config, 'setCursor');
			config.addScale({ scaleKey: 'x', time: true });

			render(
				React.createElement(TooltipPlugin, {
					config,
					render: () => null,
					syncMode: DashboardCursorSync.None,
				}),
			);

			expect(setCursorSpy).not.toHaveBeenCalled();
		});

		it('does not enable cursor sync when scale is not time-based', () => {
			const config = createConfigMock();
			const setCursorSpy = jest.spyOn(config, 'setCursor');
			config.addScale({ scaleKey: 'x', time: false });

			render(
				React.createElement(TooltipPlugin, {
					config,
					render: () => null,
					syncMode: DashboardCursorSync.Tooltip,
				}),
			);

			expect(setCursorSpy).not.toHaveBeenCalled();
		});
	});

	// ---- Cleanup ----------------------------------------------------------------

	describe('cleanup on unmount', () => {
		it('removes window event listeners and all uPlot hooks', () => {
			const config = createConfigMock();
			const addSpy = jest.spyOn(window, 'addEventListener');
			const removeSpy = jest.spyOn(window, 'removeEventListener');

			const { unmount } = render(
				React.createElement(TooltipPlugin, {
					config,
					render: () => null,
					syncMode: DashboardCursorSync.None,
				}),
			);

			const resizeCall = addSpy.mock.calls.find(([type]) => type === 'resize');
			const scrollCall = addSpy.mock.calls.find(([type]) => type === 'scroll');

			expect(resizeCall).toBeDefined();
			expect(scrollCall).toBeDefined();

			const resizeListener = resizeCall?.[1] as EventListener;
			const scrollListener = scrollCall?.[1] as EventListener;
			const scrollOptions = scrollCall?.[2];

			unmount();

			config.removeCallbacks.forEach((removeFn) => {
				expect(removeFn).toHaveBeenCalledTimes(1);
			});

			expect(removeSpy).toHaveBeenCalledWith('resize', resizeListener);
			expect(removeSpy).toHaveBeenCalledWith(
				'scroll',
				scrollListener,
				scrollOptions,
			);
		});
	});
});
