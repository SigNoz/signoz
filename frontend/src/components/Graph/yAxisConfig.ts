import { formattedValueToString, getValueFormat } from '@grafana/data';
import * as Sentry from '@sentry/react';
import { isNaN } from 'lodash-es';

/**
 * Formats a number for display, preserving leading zeros after the decimal point
 * and showing up to 5 digits after the first non-zero decimal digit.
 * It avoids scientific notation and removes unnecessary trailing zeros.
 *
 * @example
 * formatDecimalWithLeadingZeros(1.2345); // "1.234"
 * formatDecimalWithLeadingZeros(0.0012345); // "0.00123"
 * formatDecimalWithLeadingZeros(5.0); // "5"
 *
 * @param value The number to format.
 * @returns The formatted string.
 */
const formatDecimalWithLeadingZeros = (value: number): string => {
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
	const firstNonZeroIndex = decimalPart.search(/[^0]/);

	// If the decimal part consists only of zeros, return just the integer part.
	if (firstNonZeroIndex === -1) {
		return integerPart;
	}

	// Determine the number of decimals to keep: leading zeros + up to 5 significant digits.
	const decimalsToKeep = firstNonZeroIndex + 5;
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

	// Handle non-numeric or special values first.
	if (isNaN(numValue)) return 'NaN';
	if (numValue === Infinity) return '∞';
	if (numValue === -Infinity) return '-∞';

	const decimalPlaces = value.split('.')[1]?.length || undefined;

	// Use high-precision formatter for the 'none' format.
	if (format === 'none') {
		return formatDecimalWithLeadingZeros(numValue);
	}

	// For all other standard formats, delegate to grafana/data's built-in formatter.
	try {
		const formatter = getValueFormat(format);
		const formattedValue = formatter(
			numValue,
			decimalPlaces && decimalPlaces >= 5 ? decimalPlaces : 5,
			undefined,
		);
		if (formattedValue.text && formattedValue.text.includes('.')) {
			formattedValue.text = formatDecimalWithLeadingZeros(
				parseFloat(formattedValue.text),
			);
		}

		return formattedValueToString(formattedValue);
	} catch (error) {
		Sentry.captureEvent({
			message: `Error applying formatter: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`,
			level: 'error',
		});
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
