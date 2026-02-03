import { Scale } from 'uplot';

import {
	adjustSoftLimitsWithThresholds,
	createRangeFunction,
	getDistributionConfig,
	getFallbackMinMaxTimeStamp,
	getRangeConfig,
	normalizeLogScaleLimits,
} from '../utils/scale';
import { ConfigBuilder, ScaleProps } from './types';

/**
 * Builder for uPlot scale configuration
 * Handles creation and merging of scale settings
 */
export class UPlotScaleBuilder extends ConfigBuilder<
	ScaleProps,
	Record<string, Scale>
> {
	private softMin: number | null;
	private softMax: number | null;
	private min: number | null;
	private max: number | null;

	constructor(props: ScaleProps) {
		super(props);
		// By default while creating a widget we set the softMin and softMax to 0, so we need to handle this case separately
		const isDefaultSoftMinMax = props.softMin === 0 && props.softMax === 0;
		this.softMin = isDefaultSoftMinMax ? null : props.softMin ?? null;
		this.softMax = isDefaultSoftMinMax ? null : props.softMax ?? null;
		this.min = props.min ?? null;
		this.max = props.max ?? null;
	}

	getConfig(): Record<string, Scale> {
		const {
			scaleKey,
			time,
			range,
			thresholds,
			logBase = 10,
			padMinBy = 0.1,
			padMaxBy = 0.1,
		} = this.props;

		// Special handling for time scales (X axis)
		if (time) {
			let minTime = this.min ?? 0;
			let maxTime = this.max ?? 0;

			// Fallback when min/max are not provided
			if (!minTime || !maxTime) {
				const { fallbackMin, fallbackMax } = getFallbackMinMaxTimeStamp();
				minTime = fallbackMin;
				maxTime = fallbackMax;
			}

			// Align max time to "endTime - 1 minute", rounded down to minute precision
			// This matches legacy getXAxisScale behavior and avoids empty space at the right edge
			const oneMinuteAgoTimestamp = (maxTime - 60) * 1000;
			const currentDate = new Date(oneMinuteAgoTimestamp);

			currentDate.setSeconds(0);
			currentDate.setMilliseconds(0);

			const unixTimestampSeconds = Math.floor(currentDate.getTime() / 1000);
			maxTime = unixTimestampSeconds;

			return {
				[scaleKey]: {
					time: true,
					auto: false,
					range: [minTime, maxTime],
				},
			};
		}

		const distr = this.props.distribution;

		// Adjust softMin/softMax to include threshold values
		// This ensures threshold lines are visible within the scale range
		const thresholdList = thresholds?.thresholds;
		const {
			softMin: adjustedSoftMin,
			softMax: adjustedSoftMax,
		} = adjustSoftLimitsWithThresholds(
			this.softMin,
			this.softMax,
			thresholdList,
			thresholds?.yAxisUnit,
		);

		const { min, max, softMin, softMax } = normalizeLogScaleLimits({
			distr,
			logBase,
			limits: {
				min: this.min,
				max: this.max,
				softMin: adjustedSoftMin,
				softMax: adjustedSoftMax,
			},
		});

		const distribution = getDistributionConfig({
			time,
			distr,
			logBase,
		});

		const {
			rangeConfig,
			hardMinOnly,
			hardMaxOnly,
			hasFixedRange,
		} = getRangeConfig(min, max, softMin, softMax, padMinBy, padMaxBy);

		const rangeFn = createRangeFunction({
			rangeConfig,
			hardMinOnly,
			hardMaxOnly,
			hasFixedRange,
			min,
			max,
		});

		let auto = this.props.auto;
		auto ??= !time && !hasFixedRange;

		return {
			[scaleKey]: {
				time,
				auto,
				range: range ?? rangeFn,
				...distribution,
			},
		};
	}

	merge(props: Partial<ScaleProps>): void {
		this.props = { ...this.props, ...props };
		if (props.softMin !== undefined) {
			this.softMin = props.softMin ?? null;
		}
		if (props.softMax !== undefined) {
			this.softMax = props.softMax ?? null;
		}
		if (props.min !== undefined) {
			this.min = props.min ?? null;
		}
		if (props.max !== undefined) {
			this.max = props.max ?? null;
		}
	}
}

export type { ScaleProps };
