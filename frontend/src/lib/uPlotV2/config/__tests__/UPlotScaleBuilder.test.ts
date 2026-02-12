import type uPlot from 'uplot';

import * as scaleUtils from '../../utils/scale';
import type { ScaleProps } from '../types';
import { DistributionType } from '../types';
import { UPlotScaleBuilder } from '../UPlotScaleBuilder';

const createScaleProps = (overrides: Partial<ScaleProps> = {}): ScaleProps => ({
	scaleKey: 'y',
	time: false,
	auto: undefined,
	min: undefined,
	max: undefined,
	softMin: undefined,
	softMax: undefined,
	distribution: DistributionType.Linear,
	...overrides,
});

describe('UPlotScaleBuilder', () => {
	const getFallbackMinMaxSpy = jest.spyOn(
		scaleUtils,
		'getFallbackMinMaxTimeStamp',
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('initializes softMin/softMax correctly when both are 0 (treated as unset)', () => {
		const builder = new UPlotScaleBuilder(
			createScaleProps({
				softMin: 0,
				softMax: 0,
			}),
		);

		// Non-time scale so config path uses thresholds pipeline; we just care that
		// adjustSoftLimitsWithThresholds receives null soft limits instead of 0/0.
		const adjustSpy = jest.spyOn(scaleUtils, 'adjustSoftLimitsWithThresholds');

		builder.getConfig();

		expect(adjustSpy).toHaveBeenCalledWith(null, null, undefined, undefined);
	});

	it('handles time scales using explicit min/max and rounds max down to the previous minute', () => {
		const min = 1_700_000_000; // seconds
		const max = 1_700_000_600; // seconds

		const builder = new UPlotScaleBuilder(
			createScaleProps({
				scaleKey: 'x',
				time: true,
				min,
				max,
			}),
		);

		const config = builder.getConfig();
		const xScale = config.x;

		expect(xScale.time).toBe(true);
		expect(xScale.auto).toBe(false);
		expect(Array.isArray(xScale.range)).toBe(true);

		const [resolvedMin, resolvedMax] = xScale.range as [number, number];

		// min is passed through
		expect(resolvedMin).toBe(min);

		// max is coerced to "endTime - 1 minute" and rounded down to minute precision
		const oneMinuteAgoTimestamp = (max - 60) * 1000;
		const currentDate = new Date(oneMinuteAgoTimestamp);
		currentDate.setSeconds(0);
		currentDate.setMilliseconds(0);
		const expectedMax = Math.floor(currentDate.getTime() / 1000);

		expect(resolvedMax).toBe(expectedMax);
	});

	it('falls back to getFallbackMinMaxTimeStamp when time scale has no min/max', () => {
		getFallbackMinMaxSpy.mockReturnValue({
			fallbackMin: 100,
			fallbackMax: 200,
		});

		const builder = new UPlotScaleBuilder(
			createScaleProps({
				scaleKey: 'x',
				time: true,
				min: undefined,
				max: undefined,
			}),
		);

		const config = builder.getConfig();
		const [resolvedMin, resolvedMax] = config.x.range as [number, number];

		expect(getFallbackMinMaxSpy).toHaveBeenCalled();
		expect(resolvedMin).toBe(100);
		// max is aligned to "fallbackMax - 60 seconds" minute boundary
		expect(resolvedMax).toBeLessThanOrEqual(200);
		expect(resolvedMax).toBeGreaterThan(100);
	});

	it('pipes limits through soft-limit adjustment and log-scale normalization before range config', () => {
		const adjustSpy = jest.spyOn(scaleUtils, 'adjustSoftLimitsWithThresholds');
		const normalizeSpy = jest.spyOn(scaleUtils, 'normalizeLogScaleLimits');
		const getRangeConfigSpy = jest.spyOn(scaleUtils, 'getRangeConfig');

		const thresholds = {
			scaleKey: 'y',
			thresholds: [{ thresholdValue: 10 }],
			yAxisUnit: 'ms',
		};

		const builder = new UPlotScaleBuilder(
			createScaleProps({
				softMin: 1,
				softMax: 5,
				min: 0,
				max: 100,
				distribution: DistributionType.Logarithmic,
				thresholds,
				logBase: 2,
				padMinBy: 0.1,
				padMaxBy: 0.2,
			}),
		);

		builder.getConfig();

		expect(adjustSpy).toHaveBeenCalledWith(1, 5, thresholds.thresholds, 'ms');
		expect(normalizeSpy).toHaveBeenCalledWith({
			distr: DistributionType.Logarithmic,
			logBase: 2,
			limits: {
				min: 0,
				max: 100,
				softMin: expect.anything(),
				softMax: expect.anything(),
			},
		});
		expect(getRangeConfigSpy).toHaveBeenCalled();
	});

	it('computes distribution config for non-time scales and wires range function when range is not provided', () => {
		const createRangeFnSpy = jest.spyOn(scaleUtils, 'createRangeFunction');

		const builder = new UPlotScaleBuilder(
			createScaleProps({
				scaleKey: 'y',
				time: false,
				distribution: DistributionType.Linear,
			}),
		);

		const config = builder.getConfig();
		const yScale = config.y;

		expect(createRangeFnSpy).toHaveBeenCalled();

		// range should be a function when not provided explicitly
		expect(typeof yScale.range).toBe('function');

		// distribution config should be applied
		expect(yScale.distr).toBeDefined();
		expect(yScale.log).toBeDefined();
	});

	it('respects explicit range function when provided on props', () => {
		const explicitRange: uPlot.Scale.Range = jest.fn(() => [
			0,
			10,
		]) as uPlot.Scale.Range;

		const builder = new UPlotScaleBuilder(
			createScaleProps({
				scaleKey: 'y',
				range: explicitRange,
			}),
		);

		const config = builder.getConfig();
		const yScale = config.y;

		expect(yScale.range).toBe(explicitRange);
	});

	it('derives auto flag when not explicitly provided, based on hasFixedRange and time', () => {
		const getRangeConfigSpy = jest.spyOn(scaleUtils, 'getRangeConfig');

		const builder = new UPlotScaleBuilder(
			createScaleProps({
				min: 0,
				max: 100,
				time: false,
			}),
		);

		const config = builder.getConfig();
		const yScale = config.y;

		expect(getRangeConfigSpy).toHaveBeenCalled();
		// For non-time scale with fixed min/max, hasFixedRange is true → auto should remain false
		expect(yScale.auto).toBe(false);
	});

	it('merge updates internal min/max/soft limits while preserving other props', () => {
		const builder = new UPlotScaleBuilder(
			createScaleProps({
				scaleKey: 'y',
				min: 0,
				max: 10,
				softMin: 1,
				softMax: 9,
				time: false,
			}),
		);

		builder.merge({
			min: 2,
			softMax: undefined,
		});

		expect(builder.props.min).toBe(2);
		expect(builder.props.softMax).toBe(undefined);
		expect(builder.props.max).toBe(10);
		expect(builder.props.softMin).toBe(1);
		expect(builder.props.time).toBe(false);
		expect(builder.props.scaleKey).toBe('y');
		expect(builder.props.distribution).toBe(DistributionType.Linear);
		expect(builder.props.thresholds).toBe(undefined);
	});
});
