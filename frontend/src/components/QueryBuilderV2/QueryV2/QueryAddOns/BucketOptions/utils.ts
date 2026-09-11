import {
	Querybuildertypesv5BucketOptionsDTO,
	Querybuildertypesv5BucketOptionsLinearDTO,
	Querybuildertypesv5BucketOptionsLinearDTOKind,
	Querybuildertypesv5BucketOptionsLogDTO,
	Querybuildertypesv5BucketOptionsLogDTOKind,
} from 'api/generated/services/sigNoz.schemas';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';

import {
	DEFAULT_NUM_BUCKETS,
	MAX_LOG_SCALE,
	PREVIEW_BOUND_COUNT,
} from './constants';

/**
 * The toggle's own vocabulary: the two kinds the request takes, plus `auto` for
 * sending no options at all and letting the server pick the axis.
 */
export type BucketKindOption = 'auto' | 'log' | 'linear';

export const isLinearBuckets = (
	bucketOptions: Querybuildertypesv5BucketOptionsDTO,
): bucketOptions is Querybuildertypesv5BucketOptionsLinearDTO =>
	bucketOptions.kind === Querybuildertypesv5BucketOptionsLinearDTOKind.linear;

export const linearBuckets = (
	maxValue: number,
	numBuckets: number | null,
): Querybuildertypesv5BucketOptionsLinearDTO => ({
	kind: Querybuildertypesv5BucketOptionsLinearDTOKind.linear,
	spec: { maxValue, ...(numBuckets ? { numBuckets } : {}) },
});

export const logBuckets = (
	scale: number,
): Querybuildertypesv5BucketOptionsLogDTO => ({
	kind: Querybuildertypesv5BucketOptionsLogDTOKind.log,
	spec: { scale },
});

/**
 * The log spec's scale, defaulted the way the server defaults it. A linear axis has
 * no scale, so it reads as the default too.
 */
export const logScaleOf = (
	bucketOptions: Querybuildertypesv5BucketOptionsDTO | undefined,
): number =>
	bucketOptions && !isLinearBuckets(bucketOptions)
		? (bucketOptions.spec.scale ?? MAX_LOG_SCALE)
		: MAX_LOG_SCALE;

export const bandsPerDoublingFromScale = (scale: number): number => 2 ** scale;

export const scaleFromBandsPerDoubling = (bands: number): number =>
	Math.round(Math.log2(bands));

export const kindOptionOf = (
	bucketOptions: Querybuildertypesv5BucketOptionsDTO | undefined,
): BucketKindOption => {
	if (!bucketOptions) {
		return 'auto';
	}

	return isLinearBuckets(bucketOptions) ? 'linear' : 'log';
};

/**
 * The leading upper bounds the axis will carry. A log axis is anchored at 1 — band
 * index 0's boundary — and a linear one at the top of its first band; both continue
 * past what the strip shows, and everything above the last one lands in the overflow
 * band the UI labels separately.
 *
 * `undefined` for a linear axis with no max value yet: without a top there is nothing
 * to divide.
 */
export function previewUpperBounds(
	bucketOptions: Querybuildertypesv5BucketOptionsDTO | undefined,
): number[] | undefined {
	if (bucketOptions && isLinearBuckets(bucketOptions)) {
		const { maxValue, numBuckets = DEFAULT_NUM_BUCKETS } = bucketOptions.spec;

		if (!Number.isFinite(maxValue) || maxValue <= 0 || numBuckets <= 0) {
			return undefined;
		}

		const width = maxValue / numBuckets;

		return Array.from(
			{ length: Math.min(numBuckets, PREVIEW_BOUND_COUNT) },
			(_, index) => (index + 1) * width,
		);
	}

	const bands = bandsPerDoublingFromScale(logScaleOf(bucketOptions));

	return Array.from(
		{ length: PREVIEW_BOUND_COUNT },
		(_, index) => 2 ** (index / bands),
	);
}

/**
 * Whether the strip elides bounds after the ones it shows. A linear axis with no more
 * buckets than the strip holds ends where the strip does.
 */
export function hasBoundsBeyondPreview(
	bucketOptions: Querybuildertypesv5BucketOptionsDTO | undefined,
): boolean {
	if (!bucketOptions || !isLinearBuckets(bucketOptions)) {
		return true;
	}

	return (
		(bucketOptions.spec.numBuckets ?? DEFAULT_NUM_BUCKETS) > PREVIEW_BOUND_COUNT
	);
}

/**
 * A bound is a value on the panel's own axis, so it reads in the panel's unit when one
 * is set. Unitless, three significant digits keep the tightly spaced bounds of a fine
 * log axis distinguishable without printing the float in full.
 */
export function formatUpperBound(bound: number, unit?: string): string {
	if (unit) {
		return getYAxisFormattedValue(String(bound), unit);
	}

	return Number(bound.toPrecision(3)).toString();
}
