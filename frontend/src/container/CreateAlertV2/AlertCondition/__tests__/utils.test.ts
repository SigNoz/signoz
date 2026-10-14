import { QueryFunction } from 'types/api/v5/queryRange';

import { syncAnomalyFunction } from '../utils';

const timeShift: QueryFunction = { name: 'timeShift', args: [{ value: 3600 }] };
const anomaly = (zScoreThreshold: number): QueryFunction => ({
	name: 'anomaly',
	args: [],
	namedArgs: { z_score_threshold: zScoreThreshold },
});

describe('syncAnomalyFunction', () => {
	it('adds the anomaly function after the existing functions', () => {
		expect(syncAnomalyFunction([timeShift], 3)).toStrictEqual([
			timeShift,
			anomaly(3),
		]);
	});

	it('replaces a stale z-score and is idempotent', () => {
		const synced = syncAnomalyFunction([anomaly(3), timeShift], 5);
		expect(synced).toStrictEqual([timeShift, anomaly(5)]);
		expect(syncAnomalyFunction(synced, 5)).toStrictEqual(synced);
	});

	it('removes the anomaly function when no z-score is given', () => {
		expect(syncAnomalyFunction([anomaly(3), timeShift], undefined)).toStrictEqual(
			[timeShift],
		);
	});
});
