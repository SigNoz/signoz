import { nullToUndefThreshold } from './nullHandling';

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
		const numValue = parseFloat(value);

		// If parsing failed or resulted in a non-finite number, it's invalid
		if (Number.isNaN(numValue) || !Number.isFinite(numValue)) {
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

/**
 * Apply per-series spanGaps (boolean | threshold) handling to an aligned dataset.
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

	const transformedSeries = seriesValues.map((ys, idx) => {
		const { spanGaps } = seriesOptions[idx] || {};

		if (spanGaps === undefined) {
			return ys;
		}

		if (typeof spanGaps === 'boolean') {
			if (!spanGaps) {
				return ys;
			}

			// spanGaps === true -> treat nulls as soft gaps (convert to undefined)
			return (ys as Array<number | null | undefined>).map((v) =>
				v === null ? undefined : v,
			) as uPlot.AlignedData[0];
		}

		// Numeric spanGaps: threshold-based null handling
		return nullToUndefThreshold(
			xValues as uPlot.AlignedData[0],
			ys as Array<number | null | undefined>,
			spanGaps,
		);
	});

	return [xValues, ...transformedSeries] as uPlot.AlignedData;
}
