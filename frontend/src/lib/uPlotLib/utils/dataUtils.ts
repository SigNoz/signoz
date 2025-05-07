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

export function normalizePlotValue(value: unknown): number | null {
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
