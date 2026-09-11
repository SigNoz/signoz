/**
 * Mirrors the limits `querybuildertypesv5` validates `bucketOptions` against. The
 * builder keeps its own copy so an out-of-range axis is refused before the request
 * rather than after it.
 */

/**
 * A log axis spaces bounds at 2^scale bands per doubling. MaxLogScale is the
 * resolution ClickHouse buckets at, so it is both the finest available and what an
 * absent `bucketOptions` resolves to.
 */
export const MAX_LOG_SCALE = 4;

export const MAX_NUM_BUCKETS = 512;

export const DEFAULT_NUM_BUCKETS = 60;

/**
 * The bands-per-doubling the toggle offers, coarsest first. Each is 2^scale for a
 * scale in [0, MAX_LOG_SCALE]: a negative scale is a whole number of doublings per
 * band instead, which has no bands-per-doubling label.
 */
export const LOG_BANDS_PER_DOUBLING = [1, 2, 4, 8, 16] as const;

/** How many leading upper bounds the bounds strip previews before eliding. */
export const PREVIEW_BOUND_COUNT = 8;

/** The kind toggle's options. `auto` sends no options and lets the server choose. */
export const BUCKET_KIND_OPTIONS = [
	{ value: 'auto', label: 'Auto' },
	{ value: 'log', label: 'Log' },
	{ value: 'linear', label: 'Linear' },
];

export const LOG_BANDS_OPTIONS = LOG_BANDS_PER_DOUBLING.map((bands) => ({
	value: String(bands),
	label: String(bands),
}));

export const BUCKET_KIND_HINTS = {
	auto:
		'Bounds are picked for you: a log axis at 16 bands per doubling, the finest the query can return.',
	log: 'Bounds are spaced evenly on a log axis, so every band is the same height on screen and the tail stays readable. Fewer bands per doubling means fewer, coarser bands.',
	linear:
		'Bounds are spaced evenly from 0 up to the max value, so a band covers the same width wherever it sits. Everything above the max value lands in a single overflow band.',
};
