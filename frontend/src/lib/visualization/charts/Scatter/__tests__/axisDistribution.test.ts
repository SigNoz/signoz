import { DistributionType } from 'lib/uPlotV2/config/types';

import { resolveAxisDistribution } from '../axisDistribution';
import { ScatterAxisScale } from '../types';

describe('resolveAxisDistribution', () => {
	it('is linear when asked, whatever the values', () => {
		expect(
			resolveAxisDistribution([1, 1e6], ScatterAxisScale.Linear),
		).toStrictEqual({ distribution: DistributionType.Linear });
	});

	it('is a plain log when every value is positive', () => {
		expect(resolveAxisDistribution([1, 100], ScatterAxisScale.Log)).toStrictEqual(
			{ distribution: DistributionType.Logarithmic },
		);
	});

	it('falls back from log to a symmetric log around the smallest magnitude when zero is present', () => {
		expect(
			resolveAxisDistribution([0, 0.05, 300], ScatterAxisScale.Log),
		).toStrictEqual({
			distribution: DistributionType.SymmetricLog,
			asinhThreshold: 0.01,
		});
	});

	it('keeps an explicit log axis for a soft min it cannot place', () => {
		expect(
			resolveAxisDistribution([1, 100], ScatterAxisScale.Log, [-10]),
		).toStrictEqual({ distribution: DistributionType.Logarithmic });
	});

	it('is a symmetric log when asked, even with only positive values', () => {
		expect(
			resolveAxisDistribution([2, 300], ScatterAxisScale.SymLog),
		).toStrictEqual({
			distribution: DistributionType.SymmetricLog,
			asinhThreshold: 1,
		});
	});

	it('uses a unit threshold when nothing is positive', () => {
		expect(
			resolveAxisDistribution([0, -5], ScatterAxisScale.SymLog),
		).toStrictEqual({
			distribution: DistributionType.SymmetricLog,
			asinhThreshold: 1,
		});
	});

	describe('auto', () => {
		const SKEWED = [1, 2, 3, 5, 8, 10, 20, 50, 1000];

		it.each([
			['skewed positive values', SKEWED, DistributionType.Logarithmic],
			[
				'values spread evenly across decades',
				[1, 250, 500, 750, 1000],
				DistributionType.Linear,
			],
			[
				'a single outlier among clustered values',
				[0.001, 40, 45, 50, 55, 60],
				DistributionType.Linear,
			],
			[
				'skewed values spanning under two decades',
				[10, 10, 10, 11, 50],
				DistributionType.Linear,
			],
			['no finite values', [Number.NaN], DistributionType.Linear],
		])('picks a scale for %s', (_, values, distribution) => {
			expect(resolveAxisDistribution(values, ScatterAxisScale.Auto)).toStrictEqual(
				{ distribution },
			);
		});

		it('picks symlog for skewed values that include zero', () => {
			expect(
				resolveAxisDistribution(
					[0, 0, 1, 2, 5, 10, 50, 100, 10_000],
					ScatterAxisScale.Auto,
				),
			).toStrictEqual({
				distribution: DistributionType.SymmetricLog,
				asinhThreshold: 1,
			});
		});

		it('picks symlog when a soft limit reaches zero or below', () => {
			expect(
				resolveAxisDistribution(SKEWED, ScatterAxisScale.Auto, [0]),
			).toStrictEqual({
				distribution: DistributionType.SymmetricLog,
				asinhThreshold: 1,
			});
		});

		it('counts a soft limit towards the decades it spans', () => {
			expect(
				resolveAxisDistribution([5, 50], ScatterAxisScale.Auto, [null, 5000]),
			).toStrictEqual({ distribution: DistributionType.Logarithmic });
		});

		it('is the default', () => {
			expect(resolveAxisDistribution(SKEWED)).toStrictEqual({
				distribution: DistributionType.Logarithmic,
			});
		});
	});
});
