/**
 * Normalize plot value to number or null
 * Handles string values and converts to number, returns null for invalid values
 */
export const normalizePlotValue = (
	value: string | number | null | undefined,
): number | null => {
	if (value === null || value === undefined) {
		return null;
	}

	const numValue = typeof value === 'string' ? parseFloat(value) : value;

	if (Number.isNaN(numValue) || !Number.isFinite(numValue)) {
		return null;
	}

	return numValue;
};
