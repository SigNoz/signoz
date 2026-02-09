import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import { render } from 'tests/test-utils';

import TooltipPlugin from '../TooltipPlugin/TooltipPlugin';
import { DashboardCursorSync } from '../TooltipPlugin/types';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

type HookHandler = (...args: any[]) => void;

interface ConfigMock {
	scales: Array<{ props: { time?: boolean } }>;
	setCursor: jest.Mock;
	addHook: jest.Mock<() => void, [string, HookHandler]> & {
		removeCallbacks: jest.Mock[];
	};
}

function createConfigMock(
	overrides: Partial<ConfigMock> = {},
): ConfigMock & { removeCallbacks: jest.Mock[] } {
	const removeCallbacks: jest.Mock[] = [];

	const addHook = Object.assign(
		jest.fn((_: string, _handler: HookHandler) => {
			const remove = jest.fn();
			removeCallbacks.push(remove);
			return remove;
		}),
		{ removeCallbacks },
	) as ConfigMock['addHook'];

	return {
		scales: [{ props: { time: false } }],
		setCursor: jest.fn(),
		addHook,
		...overrides,
		removeCallbacks,
	};
}

function getHandler(config: ConfigMock, hookName: string): HookHandler {
	const call = config.addHook.mock.calls.find(([name]) => name === hookName);
	if (!call) {
		throw new Error(`Hook "${hookName}" was not registered on config`);
	}
	return call[1];
}

function createFakePlot(): {
	over: HTMLDivElement;
	setCursor: jest.Mock;
	cursor: { event: Record<string, unknown> };
} {
	return {
		over: document.createElement('div'),
		setCursor: jest.fn(),
		cursor: { event: {} },
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
		jest
			.spyOn(window, 'cancelAnimationFrame')
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			.mockImplementation(() => {});
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
		renderFn: (...args: any[]) => React.ReactNode = (): React.ReactNode =>
			React.createElement('div', null, 'tooltip-body'),
		extraProps: Record<string, unknown> = {},
	): ReturnType<typeof createFakePlot> {
		render(
			React.createElement(TooltipPlugin, {
				config: config as any,
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
					config: config as any,
					render: () => React.createElement('div', null, 'tooltip-body'),
					syncMode: DashboardCursorSync.None,
				}),
			);

			expect(document.querySelector('.tooltip-plugin-container')).toBeNull();
		});

		it('registers all required uPlot hooks on mount', () => {
			const config = createConfigMock();

			render(
				React.createElement(TooltipPlugin, {
					config: config as any,
					render: () => null,
					syncMode: DashboardCursorSync.None,
				}),
			);

			const registered = config.addHook.mock.calls.map(([name]) => name);
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

			const container = document.querySelector(
				'.tooltip-plugin-container',
			) as HTMLElement;
			expect(container).not.toBeNull();
			expect(container.parentElement).toBe(document.body);
		});
	});

	// ---- Pin behaviour ----------------------------------------------------------

	describe('pin behaviour', () => {
		it('pins the tooltip when canPinTooltip is true and overlay is clicked', () => {
			const config = createConfigMock();

			const fakePlot = renderAndActivateHover(config, undefined, {
				canPinTooltip: true,
			});

			const container = document.querySelector(
				'.tooltip-plugin-container',
			) as HTMLElement;
			expect(container.classList.contains('pinned')).toBe(false);

			act(() => {
				fakePlot.over.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			});

			return waitFor(() => {
				const updated = document.querySelector(
					'.tooltip-plugin-container',
				) as HTMLElement | null;
				expect(updated).not.toBeNull();
				expect(updated?.classList.contains('pinned')).toBe(true);
			});
		});

		it('dismisses a pinned tooltip via the dismiss callback', async () => {
			jest.useFakeTimers();
			const config = createConfigMock();

			render(
				React.createElement(TooltipPlugin, {
					config: config as any,
					render: (args: any) =>
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
				jest.runAllTimers();
			});

			// Pin the tooltip.
			act(() => {
				fakePlot.over.dispatchEvent(new MouseEvent('click', { bubbles: true }));
				jest.runAllTimers();
			});

			const button = await screen.findByRole('button', { name: 'Dismiss' });

			act(() => {
				button.click();
				jest.runAllTimers();
			});

			expect(document.querySelector('.tooltip-plugin-container')).toBeNull();

			jest.useRealTimers();
		});

		it('drops a pinned tooltip when the underlying data changes', () => {
			jest.useFakeTimers();
			const config = createConfigMock();

			render(
				React.createElement(TooltipPlugin, {
					config: config as any,
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

			// Pin.
			act(() => {
				fakePlot.over.dispatchEvent(new MouseEvent('click', { bubbles: true }));
				jest.runAllTimers();
			});

			expect(
				(document.querySelector(
					'.tooltip-plugin-container',
				) as HTMLElement)?.classList.contains('pinned'),
			).toBe(true);

			// Simulate data update – should dismiss the pinned tooltip.
			act(() => {
				getHandler(config, 'setData')(fakePlot);
				jest.runAllTimers();
			});

			expect(document.querySelector('.tooltip-plugin-container')).toBeNull();

			jest.useRealTimers();
		});

		it('unpins the tooltip on outside mousedown', () => {
			jest.useFakeTimers();
			const config = createConfigMock();

			render(
				React.createElement(TooltipPlugin, {
					config: config as any,
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

			act(() => {
				fakePlot.over.dispatchEvent(new MouseEvent('click', { bubbles: true }));
				jest.runAllTimers();
			});

			expect(
				document
					.querySelector('.tooltip-plugin-container')
					?.classList.contains('pinned'),
			).toBe(true);

			// Click outside the tooltip container.
			act(() => {
				document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
				jest.runAllTimers();
			});

			expect(document.querySelector('.tooltip-plugin-container')).toBeNull();

			jest.useRealTimers();
		});

		it('unpins the tooltip on outside keydown', () => {
			jest.useFakeTimers();
			const config = createConfigMock();

			render(
				React.createElement(TooltipPlugin, {
					config: config as any,
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

			act(() => {
				fakePlot.over.dispatchEvent(new MouseEvent('click', { bubbles: true }));
				jest.runAllTimers();
			});

			expect(
				document
					.querySelector('.tooltip-plugin-container')
					?.classList.contains('pinned'),
			).toBe(true);

			// Press a key outside the tooltip.
			act(() => {
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
				);
				jest.runAllTimers();
			});

			expect(document.querySelector('.tooltip-plugin-container')).toBeNull();

			jest.useRealTimers();
		});
	});

	// ---- Cursor sync ------------------------------------------------------------

	describe('cursor sync', () => {
		it('enables uPlot cursor sync for time-based scales when mode is Tooltip', () => {
			const config = createConfigMock({
				scales: [{ props: { time: true } }],
			} as any);

			render(
				React.createElement(TooltipPlugin, {
					config: config as any,
					render: () => null,
					syncMode: DashboardCursorSync.Tooltip,
					syncKey: 'dashboard-sync',
				}),
			);

			expect(config.setCursor).toHaveBeenCalledWith({
				sync: { key: 'dashboard-sync', scales: ['x', null] },
			});
		});

		it('does not enable cursor sync when mode is None', () => {
			const config = createConfigMock({
				scales: [{ props: { time: true } }],
			} as any);

			render(
				React.createElement(TooltipPlugin, {
					config: config as any,
					render: () => null,
					syncMode: DashboardCursorSync.None,
				}),
			);

			expect(config.setCursor).not.toHaveBeenCalled();
		});

		it('does not enable cursor sync when scale is not time-based', () => {
			const config = createConfigMock({
				scales: [{ props: { time: false } }],
			} as any);

			render(
				React.createElement(TooltipPlugin, {
					config: config as any,
					render: () => null,
					syncMode: DashboardCursorSync.Tooltip,
				}),
			);

			expect(config.setCursor).not.toHaveBeenCalled();
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
					config: config as any,
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
