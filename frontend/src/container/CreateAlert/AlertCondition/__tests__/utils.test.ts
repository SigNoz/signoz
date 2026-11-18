import { QueryFunction } from 'types/api/v5/queryRange';

import { INITIAL_CRITICAL_THRESHOLD } from '../../context/constants';
import { Threshold } from '../../context/types';

import { getSmallestDeviation, syncAnomalyFunction } from '../utils';

const timeShift: QueryFunction = { name: 'timeShift', args: [{ value: 3600 }] };
const anomaly = (
	zScoreThreshold: number,
	seasonality: string,
): QueryFunction => ({
	name: 'anomaly',
	args: [],
	namedArgs: { z_score_threshold: zScoreThreshold, seasonality },
});

describe('syncAnomalyFunction', () => {
	it('adds the anomaly function after the existing functions', () => {
		expect(
			syncAnomalyFunction([timeShift], {
				z_score_threshold: 3,
				seasonality: 'daily',
			}),
		).toStrictEqual([timeShift, anomaly(3, 'daily')]);
	});

	it('replaces stale args and gives the same result when run again', () => {
		const namedArgs = { z_score_threshold: 5, seasonality: 'weekly' };
		const synced = syncAnomalyFunction(
			[anomaly(3, 'hourly'), timeShift],
			namedArgs,
		);
		expect(synced).toStrictEqual([timeShift, anomaly(5, 'weekly')]);
		expect(syncAnomalyFunction(synced, namedArgs)).toStrictEqual(synced);
	});

	it('removes the anomaly function when no args are given', () => {
		expect(
			syncAnomalyFunction([anomaly(3, 'daily'), timeShift], undefined),
		).toStrictEqual([timeShift]);
	});
});

describe('getSmallestDeviation', () => {
	it.each([
		[[3, 2], 2],
		[['2.5', 4], 2.5],
		[[3, '', 0], 3],
		[[''], 0],
	])('picks the smallest valid deviation from %p', (values, expected) => {
		const thresholds = values.map(
			(thresholdValue) =>
				({ ...INITIAL_CRITICAL_THRESHOLD, thresholdValue }) as Threshold,
		);
		expect(getSmallestDeviation(thresholds)).toBe(expected);
	});
});
