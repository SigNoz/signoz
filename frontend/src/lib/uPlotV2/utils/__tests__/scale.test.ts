import uPlot from 'uplot';

import { DistributionType } from '../../config/types';
import * as scaleUtils from '../scale';

describe('scale utils', () => {
	describe('normalizeLogScaleLimits', () => {
		it('returns limits unchanged when distribution is not logarithmic', () => {
			const limits = {
				min: 1,
				max: 100,
				softMin: 5,
				softMax: 50,
			};

			const result = scaleUtils.normalizeLogScaleLimits({
				distr: DistributionType.Linear,
				logBase: 10,
				limits,
			});

			expect(result).toEqual(limits);
		});

		it('snaps positive limits to powers of the log base when distribution is logarithmic', () => {
			const result = scaleUtils.normalizeLogScaleLimits({
				distr: DistributionType.Logarithmic,
				logBase: 10,
				limits: {
					min: 3,
					max: 900,
					softMin: 12,
					softMax: 85,
				},
			});

			expect(result.min).toBe(1); // 10^0
			expect(result.max).toBe(1000); // 10^3
			expect(result.softMin).toBe(10); // 10^1
			expect(result.softMax).toBe(100); // 10^2
		});
	});

	describe('getDistributionConfig', () => {
		it('returns empty config for time scales', () => {
			const config = scaleUtils.getDistributionConfig({
				time: true,
				distr: DistributionType.Linear,
				logBase: 2,
			});

			expect(config).toEqual({});
		});

		it('returns linear distribution settings for non-time scales', () => {
			const config = scaleUtils.getDistributionConfig({
				time: false,
				distr: DistributionType.Linear,
				logBase: 2,
			});

			expect(config.distr).toBe(1);
			expect(config.log).toBe(2);
		});

		it('returns log distribution settings for non-time scales', () => {
			const config = scaleUtils.getDistributionConfig({
				time: false,
				distr: DistributionType.Logarithmic,
				logBase: 10,
			});

			expect(config.distr).toBe(3);
			expect(config.log).toBe(10);
		});
	});

	describe('getRangeConfig', () => {
		it('computes range config and fixed range flags correctly', () => {
			const {
				rangeConfig,
				hardMinOnly,
				hardMaxOnly,
				hasFixedRange,
			} = scaleUtils.getRangeConfig(0, 100, null, null, 0.1, 0.2);

			expect(rangeConfig.min).toEqual({
				pad: 0.1,
				hard: 0,
				soft: undefined,
				mode: 3,
			});
			expect(rangeConfig.max).toEqual({
				pad: 0.2,
				hard: 100,
				soft: undefined,
				mode: 3,
			});
			expect(hardMinOnly).toBe(true);
			expect(hardMaxOnly).toBe(true);
			expect(hasFixedRange).toBe(true);
		});
	});

	describe('createRangeFunction', () => {
		it('returns [dataMin, dataMax] when no fixed range and no data', () => {
			const params = {
				rangeConfig: {} as uPlot.Range.Config,
				hardMinOnly: false,
				hardMaxOnly: false,
				hasFixedRange: false,
				min: null,
				max: null,
			};

			const rangeFn = scaleUtils.createRangeFunction(params);

			const u = ({
				scales: {
					y: {
						distr: 1,
						log: 10,
					},
				},
			} as unknown) as uPlot;

			const result = rangeFn(
				u,
				(null as unknown) as number,
				(null as unknown) as number,
				'y',
			);

			expect(result).toEqual([null, null]);
		});

		it('applies hard min/max for linear scale when only hard limits are set', () => {
			const params = {
				rangeConfig: {} as uPlot.Range.Config,
				hardMinOnly: true,
				hardMaxOnly: true,
				hasFixedRange: true,
				min: 0,
				max: 100,
			};

			const rangeFn = scaleUtils.createRangeFunction(params);

			// Use an undefined distr so the range function skips calling uPlot.rangeNum
			// and we can focus on the behavior of applyHardLimits.
			const u = ({
				scales: {
					y: {
						distr: undefined,
						log: 10,
					},
				},
			} as unknown) as uPlot;

			const result = rangeFn(u, 10, 20, 'y');

			// After applyHardLimits, the returned range should respect configured min/max
			expect(result).toEqual([0, 100]);
		});
	});

	describe('adjustSoftLimitsWithThresholds', () => {
		it('returns original soft limits when there are no thresholds', () => {
			const result = scaleUtils.adjustSoftLimitsWithThresholds(1, 5, [], 'ms');

			expect(result).toEqual({ softMin: 1, softMax: 5 });
		});

		it('expands soft limits to include threshold min/max values', () => {
			const result = scaleUtils.adjustSoftLimitsWithThresholds(
				3,
				6,
				[{ thresholdValue: 2 }, { thresholdValue: 8 }],
				'ms',
			);

			// min should be pulled down to the smallest threshold value
			expect(result.softMin).toBe(2);
			// max should be pushed up to the largest threshold value
			expect(result.softMax).toBe(8);
		});
	});

	describe('getFallbackMinMaxTimeStamp', () => {
		it('returns a 24-hour window ending at approximately now', () => {
			const { fallbackMin, fallbackMax } = scaleUtils.getFallbackMinMaxTimeStamp();

			// Difference should be exactly one day in seconds
			expect(fallbackMax - fallbackMin).toBe(86400);

			// Both should be reasonable timestamps (not NaN or negative)
			expect(fallbackMin).toBeGreaterThan(0);
			expect(fallbackMax).toBeGreaterThan(fallbackMin);
		});
	});
});
