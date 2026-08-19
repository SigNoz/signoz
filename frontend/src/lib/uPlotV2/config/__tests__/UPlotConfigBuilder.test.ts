import uPlot from 'uplot';

import {
	DEFAULT_HOVER_PROXIMITY_VALUE,
	STEP_INTERVAL_MULTIPLIER,
} from '../../constants';
import type { SeriesProps } from '../types';
import { DrawStyle, SelectionPreferencesSource, StackMode } from '../types';
import { UPlotConfigBuilder } from '../UPlotConfigBuilder';

// Mock only the real boundary that hits localStorage
jest.mock(
	'container/DashboardContainer/visualization/panels/utils/legendVisibilityUtils',
	() => ({
		getStoredSeriesVisibility: jest.fn(),
	}),
);

jest.mock('lib/uPlotV2/utils', () => ({
	calculateWidthBasedOnStepInterval: jest.fn(),
}));

const calculateWidthBasedOnStepIntervalMock = jest.requireMock(
	'lib/uPlotV2/utils',
).calculateWidthBasedOnStepInterval as jest.Mock;

const getStoredSeriesVisibilityMock = jest.requireMock(
	'container/DashboardContainer/visualization/panels/utils/legendVisibilityUtils',
) as {
	getStoredSeriesVisibility: jest.Mock;
};

describe('UPlotConfigBuilder', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	const createSeriesProps = (
		overrides: Partial<SeriesProps> = {},
	): SeriesProps => ({
		scaleKey: 'y',
		label: 'Requests',
		colorMapping: {},
		drawStyle: DrawStyle.Line,
		...overrides,
	});

	it('returns correct save selection preference flag from constructor args', () => {
		const builder = new UPlotConfigBuilder({
			id: 'widget-123',
			shouldSaveSelectionPreference: true,
		});

		expect(builder.getShouldSaveSelectionPreference()).toBe(true);
	});

	it('returns id from constructor args', () => {
		const builder = new UPlotConfigBuilder({ id: 'widget-123' });

		expect(builder.getId()).toBe('widget-123');
	});

	it('sets tzDate from constructor and includes it in config', () => {
		const tzDate = (ts: number): Date => new Date(ts);
		const builder = new UPlotConfigBuilder({ id: 'widget-123', tzDate });

		const config = builder.getConfig();

		expect(config.tzDate).toBe(tzDate);
	});

	it('does not call onDragSelect for click without drag (width === 0)', () => {
		const onDragSelect = jest.fn();
		const builder = new UPlotConfigBuilder({ id: 'widget-123', onDragSelect });

		const config = builder.getConfig();
		const setSelectHooks = config.hooks?.setSelect ?? [];
		expect(setSelectHooks).toHaveLength(1);

		const uplotInstance = {
			select: { left: 10, width: 0 },
			posToVal: jest.fn(),
		} as unknown as uPlot;

		// Simulate uPlot calling the hook
		const setSelectHook = setSelectHooks[0];
		expect(setSelectHook).toBeDefined();
		setSelectHook?.(uplotInstance);

		expect(onDragSelect).not.toHaveBeenCalled();
	});

	it('calls onDragSelect with start and end times in milliseconds for a drag selection', () => {
		const onDragSelect = jest.fn();
		const builder = new UPlotConfigBuilder({ id: 'widget-123', onDragSelect });

		const config = builder.getConfig();
		const setSelectHooks = config.hooks?.setSelect ?? [];
		expect(setSelectHooks).toHaveLength(1);

		const posToVal = jest
			.fn()
			// left position
			.mockReturnValueOnce(100)
			// left + width
			.mockReturnValueOnce(110);

		const uplotInstance = {
			select: { left: 50, width: 20 },
			posToVal,
		} as unknown as uPlot;

		const setSelectHook = setSelectHooks[0];
		expect(setSelectHook).toBeDefined();
		setSelectHook?.(uplotInstance);

		expect(onDragSelect).toHaveBeenCalledTimes(1);
		// 100 and 110 seconds converted to milliseconds
		expect(onDragSelect).toHaveBeenCalledWith(100_000, 110_000);
	});

	it('adds and removes hooks via addHook, and exposes them through getConfig', () => {
		const builder = new UPlotConfigBuilder({ id: 'widget-123' });
		const drawHook = jest.fn();

		const remove = builder.addHook('draw', drawHook as uPlot.Hooks.Defs['draw']);

		let config = builder.getConfig();
		expect(config.hooks?.draw).toContain(drawHook);

		// Remove and ensure it no longer appears in config
		remove();
		config = builder.getConfig();
		expect(config.hooks?.draw ?? []).not.toContain(drawHook);
	});

	it('adds axes, scales, and series and wires them into the final config', () => {
		const builder = new UPlotConfigBuilder({ id: 'widget-123' });

		// Add axis and scale
		builder.addAxis({ scaleKey: 'y', label: 'Requests' });
		builder.addScale({ scaleKey: 'y' });

		// Add two series – legend indices should start from 1 (0 is the timestamp series)
		builder.addSeries(createSeriesProps({ label: 'Requests' }));
		builder.addSeries(createSeriesProps({ label: 'Errors' }));

		const config = builder.getConfig();

		// Axes
		expect(config.axes).toHaveLength(1);
		expect(config.axes?.[0].scale).toBe('y');

		// Scales are returned as an object keyed by scaleKey
		expect(config.scales).toBeDefined();
		expect(Object.keys(config.scales ?? {})).toContain('y');

		// Series: base timestamp + 2 data series
		expect(config.series).toHaveLength(3);
		// Base series (index 0) has a value formatter that returns empty string
		const baseSeries = config.series?.[0] as { value?: () => string };
		expect(typeof baseSeries?.value).toBe('function');
		expect(baseSeries?.value?.()).toBe('');

		// Legend items align with series and carry label and color from series config
		const legendItems = builder.getLegendItems();
		expect(Object.keys(legendItems)).toStrictEqual(['1', '2']);
		expect(legendItems[1].seriesIndex).toBe(1);
		expect(legendItems[1].label).toBe('Requests');
		expect(legendItems[2].label).toBe('Errors');
	});

	it('merges axis when addAxis is called twice with same scaleKey', () => {
		const builder = new UPlotConfigBuilder({ id: 'widget-123' });

		builder.addAxis({ scaleKey: 'y', label: 'Requests' });
		builder.addAxis({ scaleKey: 'y', label: 'Updated Label', show: false });

		const config = builder.getConfig();

		expect(config.axes).toHaveLength(1);
		expect(config.axes?.[0].label).toBe('Updated Label');
		expect(config.axes?.[0].show).toBe(false);
	});

	it('merges scale when addScale is called twice with same scaleKey', () => {
		const builder = new UPlotConfigBuilder({ id: 'widget-123' });

		builder.addScale({ scaleKey: 'y', min: 0 });
		builder.addScale({ scaleKey: 'y', max: 100 });

		const config = builder.getConfig();

		// Only one scale entry for 'y' (merge path used, no duplicate added)
		expect(config.scales).toBeDefined();
		const scales = config.scales ?? {};
		expect(Object.keys(scales)).toStrictEqual(['y']);
		expect(scales.y?.range).toBeDefined();
	});

	it('restores visibility state from localStorage when selectionPreferencesSource is LOCAL_STORAGE', () => {
		getStoredSeriesVisibilityMock.getStoredSeriesVisibility.mockReturnValue([
			{ label: 'Requests', show: true },
			{ label: 'Errors', show: false },
		]);

		const builder = new UPlotConfigBuilder({
			id: 'widget-1',
			selectionPreferencesSource: SelectionPreferencesSource.LOCAL_STORAGE,
		});

		builder.addSeries(createSeriesProps({ label: 'Requests' }));
		builder.addSeries(createSeriesProps({ label: 'Errors' }));

		const legendItems = builder.getLegendItems();

		// When any series is hidden, visibility is driven by stored label-based preferences
		expect(legendItems[1].show).toBe(true);
		expect(legendItems[2].show).toBe(false);

		const config = builder.getConfig();
		const [, firstSeries, secondSeries] = config.series ?? [];

		expect(firstSeries?.show).toBe(true);
		expect(secondSeries?.show).toBe(false);
	});

	it('hides new series by default when there is a mixed preference and a visible label matches current series', () => {
		getStoredSeriesVisibilityMock.getStoredSeriesVisibility.mockReturnValue([
			{ label: 'Requests', show: true },
			{ label: 'Errors', show: false },
		]);

		const builder = new UPlotConfigBuilder({
			id: 'widget-1',
			selectionPreferencesSource: SelectionPreferencesSource.LOCAL_STORAGE,
		});

		builder.addSeries(createSeriesProps({ label: 'Requests' }));
		builder.addSeries(createSeriesProps({ label: 'Errors' }));
		builder.addSeries(createSeriesProps({ label: 'Latency' }));

		const legendItems = builder.getLegendItems();

		// Stored labels: Requests (visible), Errors (hidden).
		// New label "Latency" should be hidden because there is a mixed preference
		// and "Requests" (a visible stored label) is present in the current series.
		expect(legendItems[1].label).toBe('Requests');
		expect(legendItems[1].show).toBe(true);
		expect(legendItems[2].label).toBe('Errors');
		expect(legendItems[2].show).toBe(false);
		expect(legendItems[3].label).toBe('Latency');
		expect(legendItems[3].show).toBe(false);

		const config = builder.getConfig();
		const [, firstSeries, secondSeries, thirdSeries] = config.series ?? [];

		expect(firstSeries?.label).toBe('Requests');
		expect(firstSeries?.show).toBe(true);
		expect(secondSeries?.label).toBe('Errors');
		expect(secondSeries?.show).toBe(false);
		expect(thirdSeries?.label).toBe('Latency');
		expect(thirdSeries?.show).toBe(false);
	});

	it('shows all series when there is a mixed preference but no visible stored labels match current series', () => {
		getStoredSeriesVisibilityMock.getStoredSeriesVisibility.mockReturnValue([
			{ label: 'StoredVisible', show: true },
			{ label: 'StoredHidden', show: false },
		]);

		const builder = new UPlotConfigBuilder({
			id: 'widget-1',
			selectionPreferencesSource: SelectionPreferencesSource.LOCAL_STORAGE,
		});

		// None of these labels intersect with the stored visible label "StoredVisible"
		builder.addSeries(createSeriesProps({ label: 'CPU' }));
		builder.addSeries(createSeriesProps({ label: 'Memory' }));

		const legendItems = builder.getLegendItems();

		// Mixed preference exists in storage, but since no visible labels intersect
		// with current series, stored preferences are ignored and all are visible.
		expect(legendItems[1].label).toBe('CPU');
		expect(legendItems[1].show).toBe(true);
		expect(legendItems[2].label).toBe('Memory');
		expect(legendItems[2].show).toBe(true);

		const config = builder.getConfig();
		const [, firstSeries, secondSeries] = config.series ?? [];

		expect(firstSeries?.label).toBe('CPU');
		expect(firstSeries?.show).toBe(true);
		expect(secondSeries?.label).toBe('Memory');
		expect(secondSeries?.show).toBe(true);
	});

	it('treats duplicate labels as visible when any stored entry for that label is visible', () => {
		getStoredSeriesVisibilityMock.getStoredSeriesVisibility.mockReturnValue([
			{ label: 'CPU', show: true },
			{ label: 'CPU', show: false },
		]);

		const builder = new UPlotConfigBuilder({
			id: 'widget-dup',
			selectionPreferencesSource: SelectionPreferencesSource.LOCAL_STORAGE,
		});

		// Two series with the same label; both should be visible because at least
		// one stored entry for "CPU" is visible.
		builder.addSeries(createSeriesProps({ label: 'CPU' }));
		builder.addSeries(createSeriesProps({ label: 'CPU' }));

		const legendItems = builder.getLegendItems();

		expect(legendItems[1].label).toBe('CPU');
		expect(legendItems[1].show).toBe(true);
		expect(legendItems[2].label).toBe('CPU');
		expect(legendItems[2].show).toBe(true);

		const config = builder.getConfig();
		const [, firstSeries, secondSeries] = config.series ?? [];

		expect(firstSeries?.label).toBe('CPU');
		expect(firstSeries?.show).toBe(true);
		expect(secondSeries?.label).toBe('CPU');
		expect(secondSeries?.show).toBe(true);
	});

	it('does not attempt to read stored visibility when using in-memory preferences', () => {
		const builder = new UPlotConfigBuilder({
			id: 'widget-1',
			selectionPreferencesSource: SelectionPreferencesSource.IN_MEMORY,
		});

		builder.addSeries(createSeriesProps({ label: 'Requests' }));

		builder.getLegendItems();
		builder.getConfig();

		expect(
			getStoredSeriesVisibilityMock.getStoredSeriesVisibility,
		).not.toHaveBeenCalled();
	});

	it('adds thresholds only once per scale key', () => {
		const builder = new UPlotConfigBuilder({ id: 'widget-123' });

		const thresholdsOptions = {
			scaleKey: 'y',
			thresholds: [{ thresholdValue: 100 }],
		};

		builder.addThresholds(thresholdsOptions);
		builder.addThresholds(thresholdsOptions);

		const config = builder.getConfig();
		const drawHooks = config.hooks?.draw ?? [];

		// Only a single draw hook should be registered for the same scaleKey
		expect(drawHooks).toHaveLength(1);
	});

	it('adds multiple thresholds when scale key is different', () => {
		const builder = new UPlotConfigBuilder({ id: 'widget-123' });

		const thresholdsOptions = {
			scaleKey: 'y',
			thresholds: [{ thresholdValue: 100 }],
		};
		builder.addThresholds(thresholdsOptions);
		const thresholdsOptions2 = {
			scaleKey: 'y2',
			thresholds: [{ thresholdValue: 200 }],
		};
		builder.addThresholds(thresholdsOptions2);

		const config = builder.getConfig();
		const drawHooks = config.hooks?.draw ?? [];

		// Two draw hooks should be registered for different scaleKeys
		expect(drawHooks).toHaveLength(2);
	});

	it('merges cursor configuration with defaults instead of replacing them', () => {
		const builder = new UPlotConfigBuilder({ id: 'widget-123' });

		builder.setCursor({
			drag: { setScale: false },
		});

		const config = builder.getConfig();

		expect(config.cursor?.drag?.setScale).toBe(false);
		// Points configuration from DEFAULT_CURSOR_CONFIG should still be present
		expect(config.cursor?.points).toBeDefined();
	});

	describe('getCursorConfig', () => {
		it('returns default cursor merged with custom cursor when no stepInterval', () => {
			const builder = new UPlotConfigBuilder({ id: 'widget-123' });

			builder.setCursor({
				drag: { setScale: false },
			});

			const cursorConfig = builder.getCursorConfig();

			expect(cursorConfig.drag?.setScale).toBe(false);
			expect(cursorConfig.hover?.prox).toBe(DEFAULT_HOVER_PROXIMITY_VALUE);
			expect(cursorConfig.points).toBeDefined();
		});

		it('returns hover prox as DEFAULT_HOVER_PROXIMITY_VALUE when stepInterval is not set', () => {
			const builder = new UPlotConfigBuilder({ id: 'widget-123' });

			const cursorConfig = builder.getCursorConfig();

			expect(cursorConfig.hover?.prox).toBe(DEFAULT_HOVER_PROXIMITY_VALUE);
		});

		it('returns hover prox as function when stepInterval is set, computing width * multiplier', () => {
			const stepInterval = 60;
			const mockWidth = 100;
			calculateWidthBasedOnStepIntervalMock.mockReturnValue(mockWidth);

			const builder = new UPlotConfigBuilder({ id: 'widget-123', stepInterval });
			const cursorConfig = builder.getCursorConfig();

			expect(typeof cursorConfig.hover?.prox).toBe('function');

			const uPlotInstance = {} as uPlot;
			const prox = cursorConfig.hover?.prox as ((u: uPlot) => number) | undefined;
			expect(prox).toBeDefined();
			const proxResult = prox ? prox(uPlotInstance) : NaN;

			expect(calculateWidthBasedOnStepIntervalMock).toHaveBeenCalledWith({
				uPlotInstance,
				stepInterval,
			});
			expect(proxResult).toBe(mockWidth * STEP_INTERVAL_MULTIPLIER);
		});
	});

	it('adds plugins and includes them in config', () => {
		const builder = new UPlotConfigBuilder({ id: 'widget-123' });
		const plugin: uPlot.Plugin = {
			opts: (): void => {},
			hooks: {},
		};

		builder.addPlugin(plugin);

		const config = builder.getConfig();

		expect(config.plugins).toContain(plugin);
	});

	it('sets padding, legend, focus, select, tzDate, bands and includes them in config', () => {
		const tzDate = (ts: number): Date => new Date(ts);
		const builder = new UPlotConfigBuilder({ id: 'widget-123' });

		const bands: uPlot.Band[] = [{ series: [1, 2], fill: (): string => '#000' }];

		builder.setBands(bands);
		builder.setPadding([10, 20, 30, 40]);
		builder.setLegend({ show: true, live: true });
		builder.setFocus({ alpha: 0.5 });
		builder.setSelect({ left: 0, width: 0, top: 0, height: 0 });
		builder.setTzDate(tzDate);

		const config = builder.getConfig();

		expect(config.bands).toStrictEqual(bands);
		expect(config.padding).toStrictEqual([10, 20, 30, 40]);
		expect(config.legend).toStrictEqual({ show: true, live: true });
		expect(config.focus).toStrictEqual({ alpha: 0.5 });
		expect(config.select).toStrictEqual({ left: 0, width: 0, top: 0, height: 0 });
		expect(config.tzDate).toBe(tzDate);
	});

	it('does not include plugins when none added', () => {
		const builder = new UPlotConfigBuilder({ id: 'widget-123' });

		const config = builder.getConfig();

		expect(config.plugins).toBeUndefined();
	});

	it('does not include bands when empty', () => {
		const builder = new UPlotConfigBuilder({ id: 'widget-123' });

		const config = builder.getConfig();

		expect(config.bands).toBeUndefined();
	});
});

describe('UPlotConfigBuilder stacking', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		getStoredSeriesVisibilityMock.getStoredSeriesVisibility.mockReturnValue([]);
	});

	/**
	 * Soft limits end up captured in the scale's range closure, so the only way to read
	 * them back is to run it and inspect the range config it hands uPlot.
	 */
	function scaleSoftLimits(
		builder: UPlotConfigBuilder,
		scaleKey: string,
	): { min: number; max: number } {
		const rangeNum = jest.fn().mockReturnValue([0, 0]);
		(uPlot as unknown as { rangeNum: unknown }).rangeNum = rangeNum;

		const range = builder.getConfig().scales?.[scaleKey]?.range as (
			u: unknown,
			min: number,
			max: number,
			key: string,
		) => void;
		range({ scales: { [scaleKey]: { distr: 1 } } }, 40, 60, scaleKey);

		const [, , rangeConfig] = rangeNum.mock.calls[0] as [
			number,
			number,
			{ min: { soft: number }; max: { soft: number } },
		];
		return { min: rangeConfig.min.soft, max: rangeConfig.max.soft };
	}

	/** Renders y-axis ticks the way uPlot would, so unit formatting is observable. */
	function yAxisTicks(builder: UPlotConfigBuilder, ticks: number[]): string[] {
		const yAxis = builder.getConfig().axes?.find((a) => a.scale === 'y');
		const values = yAxis?.values as (
			u: unknown,
			splits: number[],
		) => (string | null)[];
		return values(null, ticks).map((v) => String(v));
	}

	function builderFor(stack?: StackMode, seriesCount = 3): UPlotConfigBuilder {
		const builder = new UPlotConfigBuilder({ id: 'stack-test' });
		if (stack) {
			builder.setStack(stack);
		}
		builder.addAxis({ scaleKey: 'y', show: true, side: 3, yAxisUnit: 'ms' });
		for (let i = 0; i < seriesCount; i++) {
			builder.addSeries({
				scaleKey: 'y',
				label: `S${i}`,
				drawStyle: DrawStyle.Bar,
				colorMapping: {},
				isDarkMode: false,
			} as SeriesProps);
		}
		return builder;
	}

	it('defaults to no stacking, so no bands and the panel unit on the axis', () => {
		const builder = builderFor();

		expect(builder.getStackMode()).toBe('none');
		expect(builder.getConfig().bands).toBeUndefined();
		expect(yAxisTicks(builder, [1000])).toStrictEqual(['1 s']);
	});

	it('derives one band per adjacent series pair once a stack is declared', () => {
		expect(builderFor(StackMode.Normal).getConfig().bands).toStrictEqual([
			{ series: [1, 2] },
			{ series: [2, 3] },
		]);
	});

	it('emits no bands for a single series', () => {
		expect(builderFor(StackMode.Normal, 1).getConfig().bands).toBeUndefined();
	});

	it('keeps the panel unit on the axis for a normal stack', () => {
		expect(yAxisTicks(builderFor(StackMode.Normal), [1000])).toStrictEqual([
			'1 s',
		]);
	});

	it('formats the axis as percentages for a percent stack', () => {
		expect(yAxisTicks(builderFor(StackMode.Percent), [0, 50, 100])).toStrictEqual(
			['0%', '50%', '100%'],
		);
	});

	it('leaves other axes on their own unit under a percent stack', () => {
		const builder = builderFor(StackMode.Percent);
		builder.addAxis({ scaleKey: 'x', show: true, side: 2 });

		expect(builder.getConfig().axes?.map((a) => a.scale)).toStrictEqual([
			'y',
			'x',
		]);
	});

	it('pins the y scale to the 0–100 band under a percent stack, dropping panel limits', () => {
		const builder = new UPlotConfigBuilder({ id: 'stack-scale' });
		builder.setStack(StackMode.Percent);
		builder.addScale({ scaleKey: 'y', softMin: 5, softMax: 500 });

		// Soft, not hard: mixed-sign shares fall outside 0–100 and must stay visible.
		expect(builder.getConfig().scales?.y).toMatchObject({ auto: true });
		expect(scaleSoftLimits(builder, 'y')).toStrictEqual({ min: 0, max: 100 });
	});

	it('leaves the panel limits alone when the stack is not percent', () => {
		const builder = new UPlotConfigBuilder({ id: 'stack-scale' });
		builder.setStack(StackMode.Normal);
		builder.addScale({ scaleKey: 'y', softMin: 5, softMax: 500 });

		expect(scaleSoftLimits(builder, 'y')).toStrictEqual({ min: 5, max: 500 });
	});

	it.each([StackMode.Normal, StackMode.Percent])(
		'draws thresholds under a %s stack',
		(stack) => {
			const builder = new UPlotConfigBuilder({ id: 'stack-thr' });
			builder.setStack(stack);
			builder.addThresholds({
				scaleKey: 'y',
				thresholds: [{ thresholdValue: 500, thresholdColor: 'red' }],
				yAxisUnit: 'ms',
			});

			expect(builder.getConfig().hooks?.draw).toHaveLength(1);
		},
	);

	it('keeps a source-unit threshold from stretching the percent band', () => {
		const builder = new UPlotConfigBuilder({ id: 'stack-thr' });
		builder.setStack(StackMode.Percent);
		const thresholds = {
			scaleKey: 'y',
			thresholds: [{ thresholdValue: 500, thresholdColor: 'red' }],
			yAxisUnit: 'ms',
		};
		builder.addThresholds(thresholds);
		builder.addScale({ scaleKey: 'y', thresholds });

		// Without this the 500ms threshold would widen a percentage axis to 0–500.
		expect(scaleSoftLimits(builder, 'y')).toStrictEqual({ min: 0, max: 100 });
	});

	it('lets explicit bands win over the derived ones', () => {
		const builder = builderFor(StackMode.Normal);
		builder.setBands([{ series: [1, 3] }]);

		expect(builder.getConfig().bands).toStrictEqual([{ series: [1, 3] }]);
	});
});
