/**
 * Checks if a value is invalid for plotting
 *
 * @param value - The value to check
 * @returns true if the value is invalid (should be replaced with null), false otherwise
 */
export function isInvalidPlotValue(value: unknown): boolean {
	// Check for null or undefined
	if (value === null || value === undefined) {
		return true;
	}

	// Handle number checks
	if (typeof value === 'number') {
		// Check for NaN, Infinity, -Infinity
		return !Number.isFinite(value);
	}

	// Handle string values
	if (typeof value === 'string') {
		// Check for string representations of infinity
		if (['+Inf', '-Inf', 'Infinity', '-Infinity', 'NaN'].includes(value)) {
			return true;
		}

		// Try to parse the string as a number
		const parsedNumber = parseFloat(value);

		// If parsing failed or resulted in a non-finite number, it's invalid
		if (Number.isNaN(parsedNumber) || !Number.isFinite(parsedNumber)) {
			return true;
		}
	}

	// Value is valid for plotting
	return false;
}

export function normalizePlotValue(
	value: number | string | null | undefined,
): number | null {
	if (isInvalidPlotValue(value)) {
		return null;
	}

	// Convert string numbers to actual numbers
	if (typeof value === 'string') {
		return parseFloat(value);
	}

	// Already a valid number
	return value as number;
}

export interface SeriesSpanGapsOption {
	spanGaps?: boolean | number;
}

// Internal type alias: a series value array that may contain nulls/undefineds.
// uPlot uses null to draw a visible gap and undefined to represent "no sample"
// (the line continues across undefined points but breaks at null ones).
type SeriesArray = Array<number | null | undefined>;

/**
 * Returns true if the given gap size exceeds the numeric spanGaps threshold
 * of at least one series. Used to decide whether to insert a null break point.
 */
function gapExceedsThreshold(
	gapSize: number,
	seriesOptions: SeriesSpanGapsOption[],
): boolean {
	return seriesOptions.some(
		({ spanGaps }) =>
			typeof spanGaps === 'number' && spanGaps > 0 && gapSize > spanGaps,
	);
}

/**
 * For each series with a numeric spanGaps threshold, insert a null data point
 * between consecutive x timestamps whose gap exceeds the threshold.
 *
 * Why: uPlot draws a continuous line between all non-null points. When the
 * time gap between two consecutive samples is larger than the configured
 * spanGaps value, we inject a synthetic null at the midpoint so uPlot renders
 * a visible break instead of a misleading straight line across the gap.
 *
 * Because uPlot's AlignedData shares a single x-axis across all series, a null
 * is inserted for every series at each position where any series needs a break.
 *
 * Two-pass approach for performance:
 *   Pass 1 — count how many nulls will be inserted (no allocations).
 *   Pass 2 — fill pre-allocated output arrays by index (no push/reallocation).
 */
export function insertLargeGapNullsIntoAlignedData(
	data: uPlot.AlignedData,
	seriesOptions: SeriesSpanGapsOption[],
): uPlot.AlignedData {
	const [xValues, ...seriesValues] = data;

	if (
		!Array.isArray(xValues) ||
		xValues.length < 2 ||
		seriesValues.length === 0
	) {
		return data;
	}

	const timestamps = xValues as number[];
	const totalPoints = timestamps.length;

	// Pass 1: count insertions needed so we know the exact output length.
	// This lets us pre-allocate arrays rather than growing them dynamically.
	let insertionCount = 0;
	for (let i = 0; i < totalPoints - 1; i += 1) {
		if (gapExceedsThreshold(timestamps[i + 1] - timestamps[i], seriesOptions)) {
			insertionCount += 1;
		}
	}

	// No gaps exceed any threshold — return the original data unchanged.
	if (insertionCount === 0) {
		return data;
	}

	// Pass 2: build output arrays of exact size and fill them.
	// `writeIndex` is the write cursor into the output arrays.
	const outputLen = totalPoints + insertionCount;
	const newX = new Array<number>(outputLen);
	const newSeries: SeriesArray[] = seriesValues.map(
		() => new Array<number | null | undefined>(outputLen),
	);

	let writeIndex = 0;
	for (let i = 0; i < totalPoints; i += 1) {
		// Copy the real data point at position i
		newX[writeIndex] = timestamps[i];
		for (
			let seriesIndex = 0;
			seriesIndex < seriesValues.length;
			seriesIndex += 1
		) {
			newSeries[seriesIndex][writeIndex] = (
				seriesValues[seriesIndex] as SeriesArray
			)[i];
		}
		writeIndex += 1;

		// If the gap to the next x timestamp exceeds the threshold, insert a
		// synthetic null at the midpoint. The midpoint x is placed halfway
		// between timestamps[i] and timestamps[i+1] (minimum 1 unit past timestamps[i] to stay unique).
		if (
			i < totalPoints - 1 &&
			gapExceedsThreshold(timestamps[i + 1] - timestamps[i], seriesOptions)
		) {
			newX[writeIndex] =
				timestamps[i] +
				Math.max(1, Math.floor((timestamps[i + 1] - timestamps[i]) / 2));
			for (
				let seriesIndex = 0;
				seriesIndex < seriesValues.length;
				seriesIndex += 1
			) {
				newSeries[seriesIndex][writeIndex] = null; // null tells uPlot to break the line here
			}
			writeIndex += 1;
		}
	}

	return [newX, ...newSeries] as uPlot.AlignedData;
}

/**
 * Apply per-series spanGaps (boolean | number) handling to an aligned dataset.
 *
 * spanGaps controls how uPlot handles gaps in a series:
 *   - boolean true  → convert null → undefined so uPlot spans over every gap
 *                     (draws a continuous line, skipping missing samples)
 *   - boolean false → no change; nulls render as visible breaks (default)
 *   - number        → insert a null break point between any two consecutive
 *                     timestamps whose difference exceeds the threshold;
 *                     gaps smaller than the threshold are left as-is
 *
 * The input data is expected to be of the form:
 * [xValues, series1Values, series2Values, ...]
 */
export function applySpanGapsToAlignedData(
	data: uPlot.AlignedData,
	seriesOptions: SeriesSpanGapsOption[],
): uPlot.AlignedData {
	const [xValues, ...seriesValues] = data;

	if (!Array.isArray(xValues) || seriesValues.length === 0) {
		return data;
	}

	// Numeric spanGaps: operates on the whole dataset at once because inserting
	// null break points requires modifying the shared x-axis.
	const hasNumericSpanGaps = seriesOptions.some(
		({ spanGaps }) => typeof spanGaps === 'number',
	);
	const gapProcessed = hasNumericSpanGaps
		? insertLargeGapNullsIntoAlignedData(data, seriesOptions)
		: data;

	// Boolean spanGaps === true: convert null → undefined per series so uPlot
	// draws a continuous line across missing samples instead of breaking it.
	// Skip this pass entirely if no series uses spanGaps: true.
	const hasBooleanTrue = seriesOptions.some(({ spanGaps }) => spanGaps === true);
	if (!hasBooleanTrue) {
		return gapProcessed;
	}

	const [newX, ...newSeries] = gapProcessed;
	const transformedSeries = newSeries.map((yValues, seriesIndex) => {
		const { spanGaps } = seriesOptions[seriesIndex] ?? {};
		if (spanGaps !== true) {
			// This series doesn't use spanGaps: true — leave it unchanged.
			return yValues;
		}
		// Replace null with undefined: uPlot skips undefined points without
		// breaking the line, effectively spanning over the gap.
		return (yValues as SeriesArray).map((pointValue) =>
			pointValue === null ? undefined : pointValue,
		) as uPlot.AlignedData[0];
	});

	return [newX, ...transformedSeries] as uPlot.AlignedData;
}
