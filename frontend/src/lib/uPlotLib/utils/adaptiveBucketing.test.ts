import {
	BucketConfig,
	calculateTimeBuckets,
	calculateValueBuckets,
	createExplicitValueBuckets,
	rebucketTimeData,
	rebucketValueData,
	ValueBucketResult,
} from './adaptiveBucketing';

describe('adaptiveBucketing', () => {
	describe('calculateTimeBuckets', () => {
		const config: BucketConfig = {
			minCellSize: 20,
			maxBuckets: 50,
		};

		it('calculates buckets correctly for a simple range', () => {
			const start = 0;
			const end = 1000 * 60; // 1 minute
			const width = 1000;

			const result = calculateTimeBuckets(start, end, width, config);

			expect(result.intervalMs).toBe(2000);
			expect(result.numberOfBuckets).toBe(30);
			expect(result.cellWidth).toBeCloseTo(33.33, 1);
			expect(result.intervalLabel).toBe('2s');
		});

		it('respects maxBuckets constraint', () => {
			const start = 0;
			const end = 1000 * 60 * 60; // 1 hour
			const width = 2000;
			const constrainedConfig = { ...config, maxBuckets: 5 };

			const result = calculateTimeBuckets(start, end, width, constrainedConfig);

			expect(result.numberOfBuckets).toBeLessThanOrEqual(5);
			expect(result.numberOfBuckets).toBe(4);
			expect(result.intervalMs).toBe(1000000);
		});

		it('handles small available width', () => {
			const start = 0;
			const end = 1000 * 60; // 60,000ms
			const width = 50;

			const result = calculateTimeBuckets(start, end, width, config);

			expect(result.numberOfBuckets).toBe(2);
			expect(result.intervalMs).toBe(50000);
			expect(result.cellWidth).toBe(25); // 50 / 2
			expect(result.intervalLabel).toBe('50s');
		});

		it('rounds intervals to nice values', () => {
			const start = 0;
			const end = 1000 * 60 * 5; // 5 minutes
			const width = 600;

			const result = calculateTimeBuckets(start, end, width, config);

			expect(result.intervalMs).toBe(10000);
			expect(result.numberOfBuckets).toBe(30);
			expect(result.intervalLabel).toBe('10s');
		});
	});

	describe('calculateValueBuckets', () => {
		const config: BucketConfig = {
			minCellSize: 20,
			maxBuckets: 50,
		};

		it('calculates linear buckets correctly', () => {
			const min = 0;
			const max = 100;
			const height = 500;

			const result = calculateValueBuckets(min, max, height, config, false);

			expect(result.bucketSize).toBe(5);
			expect(result.numberOfBuckets).toBe(20);
			expect(result.cellHeight).toBe(25);
			expect(result.buckets[0]).toEqual({ start: 0, end: 5 });
			expect(result.buckets[result.buckets.length - 1]).toEqual({
				start: 95,
				end: 100,
			});
		});

		it('calculates log scale buckets correctly', () => {
			const min = 1;
			const max = 1000;
			const height = 500;

			const result = calculateValueBuckets(min, max, height, config, true);

			expect(result.numberOfBuckets).toBe(25);
			expect(result.cellHeight).toBe(20);
			// First bucket should start at 1
			expect(result.buckets[0].start).toBeCloseTo(1, 1);
			// Last bucket should end at 1000
			expect(result.buckets[result.buckets.length - 1].end).toBeCloseTo(1000, 0);
			// Log buckets are contiguous
			expect(result.buckets[1].start).toBeCloseTo(result.buckets[0].end, 10);
		});

		it('handles edge case of zero range', () => {
			const min = 10;
			const max = 10;
			const height = 500;

			const result = calculateValueBuckets(min, max, height, config, false);

			// valueRange = 0, should return single bucket
			expect(result.numberOfBuckets).toBe(1);
			expect(result.buckets[0].start).toBe(10);
			expect(result.buckets[0].end).toBe(10);
			expect(result.cellHeight).toBe(500);
		});

		it('creates buckets with nice rounded intervals', () => {
			const min = 0;
			const max = 250;
			const height = 400;

			const result = calculateValueBuckets(min, max, height, config, false);

			expect(result.bucketSize).toBe(20);
			expect(result.numberOfBuckets).toBe(13);
			expect(result.buckets[0]).toEqual({ start: 0, end: 20 });
		});
	});

	describe('createExplicitValueBuckets', () => {
		it('creates buckets from provided ranges', () => {
			const buckets = [
				{ start: 0, end: 10 },
				{ start: 10, end: 20 },
			];
			const height = 100;

			const result = createExplicitValueBuckets(buckets, height);

			expect(result.numberOfBuckets).toBe(2);
			expect(result.buckets).toEqual(buckets);
			expect(result.cellHeight).toBe(50); // 100 / 2
		});

		it('handles single bucket', () => {
			const buckets = [{ start: 0, end: 100 }];
			const height = 200;

			const result = createExplicitValueBuckets(buckets, height);

			expect(result.numberOfBuckets).toBe(1);
			expect(result.cellHeight).toBe(200);
		});
	});

	describe('rebucketTimeData', () => {
		it('rebuckets data correctly into time intervals', () => {
			// Original data: timestamp 500ms has count [10], timestamp 1500ms has count [20]
			const timestamps = [500, 1500];
			const counts = [[10], [20]];
			const startTimeMs = 0;
			const timeBucketResult = {
				intervalMs: 1000,
				numberOfBuckets: 2,
				cellWidth: 50,
				intervalLabel: '1s',
			};

			const result = rebucketTimeData(
				timestamps,
				counts,
				timeBucketResult,
				startTimeMs,
			);

			expect(result.bucketedTimestamps).toEqual([0, 1000]);
			expect(result.bucketedCounts[0]).toEqual([10]);
			expect(result.bucketedCounts[1]).toEqual([20]);
		});

		it('aggregates multiple timestamps into same bucket', () => {
			const timestamps = [100, 200, 1100, 1200];
			const counts = [[5], [10], [15], [20]];
			const startTimeMs = 0;
			const timeBucketResult = {
				intervalMs: 1000,
				numberOfBuckets: 2,
				cellWidth: 50,
				intervalLabel: '1s',
			};

			const result = rebucketTimeData(
				timestamps,
				counts,
				timeBucketResult,
				startTimeMs,
			);

			expect(result.bucketedCounts[0]).toEqual([15]);
			expect(result.bucketedCounts[1]).toEqual([35]);
		});

		it('handles empty data', () => {
			const timestamps: number[] = [];
			const counts: number[][] = [];
			const startTimeMs = 0;
			const timeBucketResult = {
				intervalMs: 1000,
				numberOfBuckets: 2,
				cellWidth: 50,
				intervalLabel: '1s',
			};

			const result = rebucketTimeData(
				timestamps,
				counts,
				timeBucketResult,
				startTimeMs,
			);

			expect(result.bucketedTimestamps).toEqual([0, 1000]);
			expect(result.bucketedCounts).toHaveLength(2);
			expect(result.bucketedCounts[0]).toEqual([]);
			expect(result.bucketedCounts[1]).toEqual([]);
		});

		it('handles multi-dimensional counts', () => {
			const timestamps = [500, 1500];
			const counts = [
				[10, 20, 30],
				[15, 25, 35],
			];
			const startTimeMs = 0;
			const timeBucketResult = {
				intervalMs: 1000,
				numberOfBuckets: 2,
				cellWidth: 50,
				intervalLabel: '1s',
			};

			const result = rebucketTimeData(
				timestamps,
				counts,
				timeBucketResult,
				startTimeMs,
			);

			expect(result.bucketedCounts[0]).toEqual([10, 20, 30]);
			expect(result.bucketedCounts[1]).toEqual([15, 25, 35]);
		});
	});

	describe('rebucketValueData', () => {
		it('redistributes values when combining buckets', () => {
			const originalBuckets = [
				{ start: 0, end: 10 },
				{ start: 10, end: 20 },
			];
			const counts = [[10, 20]]; // Row with 10 in first bucket, 20 in second

			const newBuckets = [
				{ start: 0, end: 20 }, // Combined bucket
			];
			const valueBucketResult: ValueBucketResult = {
				numberOfBuckets: 1,
				cellHeight: 100,
				buckets: newBuckets,
			};

			const result = rebucketValueData(originalBuckets, counts, valueBucketResult);

			// Should sum: 10 + 20 = 30
			expect(result.bucketedCounts[0][0]).toBe(30);
			expect(result.bucketLabels[0]).toBe('0-20');
		});

		it('splits values when subdividing buckets', () => {
			const originalBuckets = [{ start: 0, end: 20 }];
			const counts = [[20]]; // 20 items in 0-20 range

			const newBuckets = [
				{ start: 0, end: 10 },
				{ start: 10, end: 20 },
			];
			const valueBucketResult: ValueBucketResult = {
				numberOfBuckets: 2,
				cellHeight: 50,
				buckets: newBuckets,
			};

			const result = rebucketValueData(originalBuckets, counts, valueBucketResult);

			expect(result.bucketedCounts[0][0]).toBe(10);
			expect(result.bucketedCounts[0][1]).toBe(10);
			expect(result.bucketLabels).toEqual(['0-10', '10-20']);
		});

		it('handles partial overlaps correctly', () => {
			const originalBuckets = [
				{ start: 0, end: 15 },
				{ start: 15, end: 30 },
			];
			const counts = [[30, 60]]; // 30 in first, 60 in second

			const newBuckets = [
				{ start: 0, end: 10 },
				{ start: 10, end: 20 },
				{ start: 20, end: 30 },
			];
			const valueBucketResult: ValueBucketResult = {
				numberOfBuckets: 3,
				cellHeight: 33.33,
				buckets: newBuckets,
			};

			const result = rebucketValueData(originalBuckets, counts, valueBucketResult);

			expect(result.bucketedCounts[0][0]).toBeCloseTo(20, 1);
			expect(result.bucketedCounts[0][1]).toBeCloseTo(30, 1); // 10 + 20
			expect(result.bucketedCounts[0][2]).toBeCloseTo(40, 1);
		});

		it('handles multiple rows of data', () => {
			const originalBuckets = [
				{ start: 0, end: 10 },
				{ start: 10, end: 20 },
			];
			const counts = [
				[10, 20], // Row 1
				[5, 15], // Row 2
			];

			const newBuckets = [{ start: 0, end: 20 }];
			const valueBucketResult: ValueBucketResult = {
				numberOfBuckets: 1,
				cellHeight: 100,
				buckets: newBuckets,
			};

			const result = rebucketValueData(originalBuckets, counts, valueBucketResult);

			// Row 1: 10 + 20 = 30
			// Row 2: 5 + 15 = 20
			expect(result.bucketedCounts[0][0]).toBe(30);
			expect(result.bucketedCounts[1][0]).toBe(20);
		});
	});
});
