import { QueryData } from 'types/api/widgets/getQuery';
import uPlot from 'uplot';

const DEFAULT_BUCKET_COUNT = 30;

// prettier-ignore
export const histogramBucketSizes = [
    1e-9,  2e-9,  2.5e-9,  4e-9,  5e-9,
    1e-8,  2e-8,  2.5e-8,  4e-8,  5e-8,
    1e-7,  2e-7,  2.5e-7,  4e-7,  5e-7,
    1e-6,  2e-6,  2.5e-6,  4e-6,  5e-6,
    1e-5,  2e-5,  2.5e-5,  4e-5,  5e-5,
    1e-4,  2e-4,  2.5e-4,  4e-4,  5e-4,
    1e-3,  2e-3,  2.5e-3,  4e-3,  5e-3,
    1e-2,  2e-2,  2.5e-2,  4e-2,  5e-2,
    1e-1,  2e-1,  2.5e-1,  4e-1,  5e-1,
    1,     2,              4,     5,
    1e+1,  2e+1,  2.5e+1,  4e+1,  5e+1,
    1e+2,  2e+2,  2.5e+2,  4e+2,  5e+2,
    1e+3,  2e+3,  2.5e+3,  4e+3,  5e+3,
    1e+4,  2e+4,  2.5e+4,  4e+4,  5e+4,
    1e+5,  2e+5,  2.5e+5,  4e+5,  5e+5,
    1e+6,  2e+6,  2.5e+6,  4e+6,  5e+6,
    1e+7,  2e+7,  2.5e+7,  4e+7,  5e+7,
    1e+8,  2e+8,  2.5e+8,  4e+8,  5e+8,
    1e+9,  2e+9,  2.5e+9,  4e+9,  5e+9,
  ];

export function incrRoundDn(num: number, incr: number): number {
	return Math.floor(num / incr) * incr;
}

const histSort = (a: number, b: number): number => a - b;

export function roundDecimals(val: number, dec = 0): number {
	if (Number.isInteger(val)) {
		return val;
	}

	const p = 10 ** dec;
	const n = val * p * (1 + Number.EPSILON);
	return Math.round(n) / p;
}

export function histogram(
	vals: number[],
	getBucket: (v: number) => number,
	sort?: ((a: number, b: number) => number) | null,
): [number[], number[]] {
	const hist = new Map();

	for (let i = 0; i < vals.length; i++) {
		let v = vals[i];

		if (v != null) {
			v = getBucket(v);
		}

		const entry = hist.get(v);

		if (entry) {
			entry.count++;
		} else {
			hist.set(v, { value: v, count: 1 });
		}
	}

	const bins = [...hist.values()];

	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	sort && bins.sort((a, b) => sort(a.value, b.value));

	const values = Array(bins.length);
	const counts = Array(bins.length);

	for (let i = 0; i < bins.length; i++) {
		values[i] = bins[i].value;
		counts[i] = bins[i].count;
	}

	return [values, counts];
}

export const buildHistogramData = (
	data: QueryData[] | undefined,
): uPlot.AlignedData => {
	let bucketSize = 0;
	const bucketCount = DEFAULT_BUCKET_COUNT;
	const bucketOffset = 0;

	const seriesValues: number[] = [];
	data?.forEach((item) => {
		item.values.forEach((value) => {
			seriesValues.push(parseFloat(value[1]) || 0);
		});
	});

	seriesValues.sort((a, b) => a - b);

	let smallestDelta = Infinity;
	if (seriesValues.length === 1) {
		smallestDelta = 0;
	} else {
		for (let i = 1; i < seriesValues.length; i++) {
			const delta = seriesValues[i] - seriesValues[i - 1];
			if (delta !== 0) {
				smallestDelta = Math.min(smallestDelta, delta);
			}
		}
	}

	const min = seriesValues[0];
	const max = seriesValues[seriesValues.length - 1];

	const range = max - min;
	const targetSize = range / bucketCount;

	for (let i = 0; i < histogramBucketSizes.length; i++) {
		const newBucketSize = histogramBucketSizes[i];

		if (targetSize < newBucketSize && newBucketSize >= smallestDelta) {
			bucketSize = newBucketSize;
			break;
		}
	}

	const getBucket = (v: number): number =>
		roundDecimals(incrRoundDn(v - bucketOffset, bucketSize) + bucketOffset, 9);

	const frames: number[][] = [];

	data?.forEach((item) => {
		const newFrame: number[] = [];
		item.values.forEach((value) => {
			newFrame.push(parseFloat(value[1]) || 0);
		});
		frames.push(newFrame);
	});

	const histograms: number[] = [];
	const bucketCounts: number[] = [];

	frames.forEach((frame) => {
		const [values, counts] = histogram(frame, getBucket, histSort);
		histograms.push(...values);
		bucketCounts.push(...counts);
	});

	histograms.shift();
	bucketCounts.shift();
	histograms.unshift(histograms[0] - bucketSize);
	bucketCounts.unshift(0);
	return [histograms, bucketCounts] as uPlot.AlignedData;
};
