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

/** One band per 16x, the coarsest axis worth rendering. */
export const MIN_LOG_SCALE = -4;

export const MAX_NUM_BUCKETS = 512;

export const DEFAULT_NUM_BUCKETS = 60;

/** Every scale the request accepts, coarsest first. The bounds strip below says
 *  how coarse a given one is, so the numbers stand alone. */
export const LOG_SCALES = Array.from(
	{ length: MAX_LOG_SCALE - MIN_LOG_SCALE + 1 },
	(_, index) => MIN_LOG_SCALE + index,
);

/** How many leading upper bounds the bounds strip previews before eliding. */
export const PREVIEW_BOUND_COUNT = 8;

/** The kind toggle's options. `auto` sends no options and lets the server choose. */
export const BUCKET_KIND_OPTIONS = [
	{ value: 'auto', label: 'Auto' },
	{ value: 'log', label: 'Log' },
	{ value: 'linear', label: 'Linear' },
];

export const LOG_SCALE_OPTIONS = LOG_SCALES.map((scale) => ({
	value: String(scale),
	label: String(scale),
}));

export const BUCKET_KIND_HINTS = {
	auto:
		'Bounds are picked for you: a log axis at scale 4, the finest the query can return.',
	log: 'Bounds are spaced evenly on a log axis, so every band is the same height on screen and the tail stays readable. A lower scale means fewer, coarser bands.',
	linear:
		'Bounds are spaced evenly from 0 up to the max value, so a band covers the same width wherever it sits. Everything above the max value lands in a single overflow band.',
};
