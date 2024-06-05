/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-param-reassign */
import { histogramBucketSizes } from '@grafana/data';
import { QueryData } from 'types/api/widgets/getQuery';
import uPlot, { AlignedData } from 'uplot';

import {
	DEFAULT_BUCKET_COUNT,
	NULL_EXPAND,
	NULL_REMOVE,
	NULL_RETAIN,
} from './constants';

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

function nullExpand(
	yVals: Array<number | null>,
	nullIdxs: number[],
	alignedLen: number,
): void {
	for (let i = 0, xi, lastNullIdx = -1; i < nullIdxs.length; i++) {
		const nullIdx = nullIdxs[i];

		if (nullIdx > lastNullIdx) {
			xi = nullIdx - 1;
			while (xi >= 0 && yVals[xi] == null) {
				yVals[xi--] = null;
			}

			xi = nullIdx + 1;
			while (xi < alignedLen && yVals[xi] == null) {
				yVals[(lastNullIdx = xi++)] = null;
			}
		}
	}
}

export function join(
	tables: AlignedData[],
	nullModes?: number[][],
): AlignedData[] {
	let xVals: Set<number>;

	// eslint-disable-next-line prefer-const
	xVals = new Set();

	for (let ti = 0; ti < tables.length; ti++) {
		const t = tables[ti];
		const xs = t[0];
		const len = xs.length;

		for (let i = 0; i < len; i++) {
			xVals.add(xs[i]);
		}
	}

	const data = [Array.from(xVals).sort((a, b) => a - b)];

	const alignedLen = data[0].length;

	const xIdxs = new Map();

	for (let i = 0; i < alignedLen; i++) {
		xIdxs.set(data[0][i], i);
	}

	for (let ti = 0; ti < tables.length; ti++) {
		const t = tables[ti];
		const xs = t[0];

		for (let si = 1; si < t.length; si++) {
			const ys = t[si];

			const yVals = Array(alignedLen).fill(undefined);

			const nullMode = nullModes ? nullModes[ti][si] : NULL_RETAIN;

			const nullIdxs = [];

			for (let i = 0; i < ys.length; i++) {
				const yVal = ys[i];
				const alignedIdx = xIdxs.get(xs[i]);

				if (yVal === null) {
					if (nullMode !== NULL_REMOVE) {
						yVals[alignedIdx] = yVal;

						if (nullMode === NULL_EXPAND) {
							nullIdxs.push(alignedIdx);
						}
					}
				} else {
					yVals[alignedIdx] = yVal;
				}
			}

			nullExpand(yVals, nullIdxs, alignedLen);

			data.push(yVals);
		}
	}

	return (data as unknown) as AlignedData[];
}

export function histogram(
	vals: number[],
	getBucket: (v: number) => number,
	sort?: ((a: number, b: number) => number) | null,
): AlignedData {
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

function replaceUndefinedWithNull(arrays: (number | null)[][]): AlignedData[] {
	for (let i = 0; i < arrays.length; i++) {
		for (let j = 0; j < arrays[i].length; j++) {
			if (arrays[i][j] === undefined) {
				arrays[i][j] = null;
			}
		}
	}
	return (arrays as unknown) as AlignedData[];
}

function addNullToFirstHistogram(
	histograms: (number | null)[][],
	bucketSize: number,
): void {
	if (
		histograms.length > 0 &&
		histograms[0].length > 0 &&
		histograms[0][0] !== null
	) {
		histograms[0].unshift(histograms[0][0] - bucketSize);
		for (let i = 1; i < histograms.length; i++) {
			histograms[i].unshift(null);
		}
	}
}

export const buildHistogramData = (
	data: QueryData[] | undefined,
	widgetBucketSize?: number,
	widgteBucketCount?: number,
	widgetMergeAllActiveQueries?: boolean,
): uPlot.AlignedData => {
	let bucketSize = 0;
	const bucketCount = widgteBucketCount || DEFAULT_BUCKET_COUNT;
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

	if (widgetBucketSize) {
		bucketSize = widgetBucketSize;
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

	if (widgetMergeAllActiveQueries) {
		for (let i = 1; i < frames.length; i++) {
			frames[i].forEach((val) => {
				frames[0].push(val);
			});
			frames[i] = [];
		}
	}

	const histograms: AlignedData[] = [];

	frames.forEach((frame) => {
		const fieldHist = histogram(frame, getBucket, histSort);
		histograms.push(fieldHist);
	});

	const joinHistogram = replaceUndefinedWithNull(
		(join(histograms) as unknown) as (number | null)[][],
	);

	addNullToFirstHistogram(
		(joinHistogram as unknown) as (number | null)[][],
		bucketSize,
	);

	return (joinHistogram as unknown) as AlignedData;
};
