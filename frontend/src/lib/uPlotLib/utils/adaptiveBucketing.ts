export interface BucketConfig {
	minCellSize: number;
	maxBuckets: number;
}

export interface TimeBucketResult {
	intervalMs: number;
	numberOfBuckets: number;
	cellWidth: number;
	intervalLabel: string;
}

export interface ValueBucketResult {
	bucketSize: number;
	numberOfBuckets: number;
	cellHeight: number;
	buckets: Array<{ start: number; end: number }>;
}

function roundToNiceInterval(rawInterval: number): number {
	if (rawInterval <= 0) return 1;

	const magnitude = 10 ** Math.floor(Math.log10(rawInterval));
	const normalized = rawInterval / magnitude;

	let rounded: number;
	if (normalized <= 1) rounded = 1;
	else if (normalized <= 2) rounded = 2;
	else if (normalized <= 5) rounded = 5;
	else rounded = 10;

	return rounded * magnitude;
}

function formatIntervalLabel(ms: number): string {
	const second = 1000;
	const minute = 60 * second;
	const hour = 60 * minute;
	const day = 24 * hour;

	if (ms < minute) {
		const seconds = Math.round(ms / second);
		return `${seconds}s`;
	}
	if (ms < hour) {
		const minutes = Math.round(ms / minute);
		return `${minutes}min`;
	}
	if (ms < day) {
		const hours = Math.round(ms / hour);
		return `${hours}hr`;
	}
	const days = Math.round(ms / day);
	return `${days}day`;
}

export function calculateTimeBuckets(
	startTimeMs: number,
	endTimeMs: number,
	availableWidth: number,
	config: BucketConfig,
): TimeBucketResult {
	const timeRangeMs = endTimeMs - startTimeMs;

	const maxBucketsBySize = Math.floor(availableWidth / config.minCellSize);
	const effectiveMaxBuckets = Math.min(maxBucketsBySize, config.maxBuckets);

	const rawInterval = timeRangeMs / effectiveMaxBuckets;
	const intervalMs = roundToNiceInterval(rawInterval);

	const numberOfBuckets = Math.ceil(timeRangeMs / intervalMs);
	const cellWidth = availableWidth / numberOfBuckets;

	return {
		intervalMs,
		numberOfBuckets,
		cellWidth,
		intervalLabel: formatIntervalLabel(intervalMs),
	};
}

function calculateLogValueBuckets(
	minValue: number,
	maxValue: number,
	availableHeight: number,
	maxBuckets: number,
): ValueBucketResult {
	const safeMin = Math.max(0.01, minValue);
	const safeMax = Math.max(safeMin * 10, maxValue);

	const logMin = Math.log10(safeMin);
	const logMax = Math.log10(safeMax);
	const logRange = logMax - logMin;

	const numberOfBuckets = Math.min(maxBuckets, Math.ceil(logRange * 10));
	const cellHeight = availableHeight / numberOfBuckets;

	const buckets = Array.from({ length: numberOfBuckets }, (_, i) => {
		const logStart = logMin + (i * logRange) / numberOfBuckets;
		const logEnd = logMin + ((i + 1) * logRange) / numberOfBuckets;

		return {
			start: 10 ** logStart,
			end: 10 ** logEnd,
		};
	});

	return {
		bucketSize: (buckets[0]?.end ?? 0) - (buckets[0]?.start ?? 0) || 1,
		numberOfBuckets,
		cellHeight,
		buckets,
	};
}

export function calculateValueBuckets(
	minValue: number,
	maxValue: number,
	availableHeight: number,
	config: BucketConfig,
	useLogScale = false,
): ValueBucketResult {
	const valueRange = maxValue - minValue;

	const maxBucketsBySize = Math.floor(availableHeight / config.minCellSize);
	const effectiveMaxBuckets = Math.min(maxBucketsBySize, config.maxBuckets);

	// edge cases
	if (
		valueRange <= 0 ||
		effectiveMaxBuckets <= 0 ||
		!Number.isFinite(minValue) ||
		!Number.isFinite(maxValue)
	) {
		return {
			bucketSize: 1,
			numberOfBuckets: 1,
			cellHeight: availableHeight,
			buckets: [
				{
					start: Number.isFinite(minValue) ? minValue : 0,
					end: Number.isFinite(maxValue) ? maxValue : 0,
				},
			],
		};
	}

	if (useLogScale) {
		return calculateLogValueBuckets(
			minValue,
			maxValue,
			availableHeight,
			effectiveMaxBuckets,
		);
	}

	const rawInterval = valueRange / effectiveMaxBuckets;
	const selectedBucketSize = roundToNiceInterval(rawInterval);

	const buckets: Array<{ start: number; end: number }> = [];
	let currentStart =
		Math.floor(minValue / selectedBucketSize) * selectedBucketSize;

	while (currentStart < maxValue) {
		const currentEnd = currentStart + selectedBucketSize;
		buckets.push({ start: currentStart, end: currentEnd });
		currentStart = currentEnd;
	}

	const numberOfBuckets = buckets.length;
	const cellHeight = availableHeight / numberOfBuckets;

	return {
		bucketSize: selectedBucketSize,
		numberOfBuckets,
		cellHeight,
		buckets,
	};
}

export function rebucketTimeData(
	timestamps: number[],
	counts: number[][],
	timeBucketResult: TimeBucketResult,
	startTimeMs: number,
): {
	bucketedTimestamps: number[];
	bucketedCounts: number[][];
} {
	const { intervalMs, numberOfBuckets } = timeBucketResult;

	const bucketedTimestamps = Array.from(
		{ length: numberOfBuckets },
		(_, i) => startTimeMs + i * intervalMs,
	);
	const bucketedCounts: number[][] = Array.from(
		{ length: numberOfBuckets },
		() => [],
	);

	timestamps.forEach((timestamp, i) => {
		const bucketIndex = Math.floor((timestamp - startTimeMs) / intervalMs);

		if (bucketIndex >= 0 && bucketIndex < numberOfBuckets) {
			const originalCounts = counts[i] || [];
			const targetCounts = bucketedCounts[bucketIndex];

			if (targetCounts.length < originalCounts.length) {
				const oldLength = targetCounts.length;
				targetCounts.length = originalCounts.length;
				targetCounts.fill(0, oldLength);
			}

			originalCounts.forEach((origCount, j) => {
				targetCounts[j] = (targetCounts[j] || 0) + (origCount || 0);
			});
		}
	});

	return {
		bucketedTimestamps,
		bucketedCounts,
	};
}

export function rebucketValueData(
	originalBuckets: Array<{ start: number; end: number }>,
	counts: number[][],
	valueBucketResult: ValueBucketResult,
): {
	bucketedCounts: number[][];
	bucketLabels: string[];
} {
	const { buckets: newBuckets } = valueBucketResult;
	const bucketedCounts: number[][] = [];
	const bucketLabels = newBuckets.map(
		(bucket) => `${bucket.start.toFixed(0)}-${bucket.end.toFixed(0)}`,
	);

	const distributionMap = originalBuckets.map((origBucket) => {
		const distributions: Array<{ targetIdx: number; ratio: number }> = [];
		const origSize = origBucket.end - origBucket.start;

		if (origSize <= 0) {
			const matchIdx = newBuckets.findIndex(
				(newBucket, newIdx) =>
					(origBucket.start >= newBucket.start &&
						origBucket.start < newBucket.end) ||
					(newIdx === newBuckets.length - 1 && origBucket.start === newBucket.end),
			);
			if (matchIdx >= 0) {
				distributions.push({ targetIdx: matchIdx, ratio: 1 });
			}
		} else {
			newBuckets.forEach((newBucket, newIdx) => {
				const overlapStart = Math.max(origBucket.start, newBucket.start);
				const overlapEnd = Math.min(origBucket.end, newBucket.end);

				if (overlapStart < overlapEnd) {
					const overlap = overlapEnd - overlapStart;
					const ratio = overlap / origSize;
					distributions.push({ targetIdx: newIdx, ratio });
				}
			});
		}
		return distributions;
	});

	counts.forEach((originalRow) => {
		const safeRow = originalRow || [];
		const newRow = new Array(newBuckets.length).fill(0);

		safeRow.forEach((count, origIdx) => {
			if (count) {
				const distributions = distributionMap[origIdx] || [];
				distributions.forEach((dist) => {
					newRow[dist.targetIdx] += count * dist.ratio;
				});
			}
		});

		bucketedCounts.push(newRow);
	});

	return {
		bucketedCounts,
		bucketLabels,
	};
}
