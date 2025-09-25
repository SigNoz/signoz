import { formattedValueToString, getValueFormat } from '@grafana/data';
import { isNaN } from 'lodash-es';

/**
 * Formats a number for display, showing up to 3 significant decimal places.
 * It avoids scientific notation and removes unnecessary trailing zeros.
 *
 * @example
 * formatWithSignificantDecimals(1.2345); // "1.234"
 * formatWithSignificantDecimals(0.0012345); // "0.00123"
 * formatWithSignificantDecimals(5.0); // "5"
 *
 * @param value The number to format.
 * @returns The formatted string.
 */
const formatWithSignificantDecimals = (value: number): string => {
	if (value === 0) {
		return '0';
	}

	// Use toLocaleString to get a full decimal representation without scientific notation.
	const numStr = value.toLocaleString('en-US', {
		useGrouping: false,
		maximumFractionDigits: 20,
	});

	const [integerPart, decimalPart = ''] = numStr.split('.');

	// If there's no decimal part, the integer part is the result.
	if (!decimalPart) {
		return integerPart;
	}

	// Find the index of the first non-zero digit in the decimal part.
	const firstSignificantIndex = decimalPart.search(/[^0]/);

	// If the decimal part consists only of zeros, return just the integer part.
	if (firstSignificantIndex === -1) {
		return integerPart;
	}

	// Determine the number of decimals to keep: leading zeros + up to 3 significant digits.
	const decimalsToKeep = firstSignificantIndex + 3;
	const trimmedDecimalPart = decimalPart.substring(0, decimalsToKeep);

	// Remove any trailing zeros from the result to keep it clean.
	const finalDecimalPart = trimmedDecimalPart.replace(/0+$/, '');

	// Return the integer part, or the integer and decimal parts combined.
	return finalDecimalPart ? `${integerPart}.${finalDecimalPart}` : integerPart;
};

/**
 * Formats a Y-axis value based on a given format string.
 *
 * @param value The string value from the axis.
 * @param format The format identifier (e.g. 'none', 'ms', 'bytes', 'short').
 * @returns A formatted string ready for display.
 */
export const getYAxisFormattedValue = (
	value: string,
	format: string,
): string => {
	const numValue = parseFloat(value);

	console.log('numValue', numValue, value);

	// Handle non-numeric or special values first.
	if (isNaN(numValue)) return 'NaN';
	if (numValue === Infinity) return '∞';
	if (numValue === -Infinity) return '-∞';

	const decimalPlaces = value.split('.')[1]?.length || undefined;

	// Use high-precision formatter for the 'none' format.
	if (format === 'none') {
		return formatWithSignificantDecimals(numValue);
	}

	// For all other standard formats, delegate to grafana/data's built-in formatter.
	try {
		const formatter = getValueFormat(format);
		const formattedValue = formatter(
			numValue,
			decimalPlaces && decimalPlaces >= 3 ? decimalPlaces : 3,
			undefined,
		);
		if (formattedValue.text && formattedValue.text.includes('.')) {
			formattedValue.text = formatWithSignificantDecimals(
				parseFloat(formattedValue.text),
			);
		}

		return formattedValueToString(formattedValue);
	} catch (error) {
		console.error('Error applying formatter:', error);
		// Fallback
		return numValue.toString();
	}
};

export const getToolTipValue = (value: string, format?: string): string => {
	try {
		return formattedValueToString(
			getValueFormat(format)(parseFloat(value), undefined, undefined, undefined),
		);
	} catch (error) {
		console.error(error);
	}
	return `${value}`;
};
