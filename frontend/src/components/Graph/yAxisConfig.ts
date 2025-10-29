/* eslint-disable sonarjs/cognitive-complexity */
import { formattedValueToString, getValueFormat } from '@grafana/data';
import * as Sentry from '@sentry/react';
import { isNaN } from 'lodash-es';

const DEFAULT_SIGNIFICANT_DIGITS = 5;

export type PrecisionOption = 0 | 1 | 2 | 3 | 4 | 'full';

/**
 * Formats a number for display, preserving leading zeros after the decimal point
 * and showing up to DEFAULT_SIGNIFICANT_DIGITS digits after the first non-zero decimal digit.
 * It avoids scientific notation and removes unnecessary trailing zeros.
 *
 * @example
 * formatDecimalWithLeadingZeros(1.2345); // "1.2345"
 * formatDecimalWithLeadingZeros(0.0012345); // "0.0012345"
 * formatDecimalWithLeadingZeros(5.0); // "5"
 *
 * @param value The number to format.
 * @returns The formatted string.
 */
const formatDecimalWithLeadingZeros = (
	value: number,
	precision: PrecisionOption,
): string => {
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

	// Determine the number of decimals to keep: leading zeros + up to N significant digits.
	const significantDigits =
		precision === 'full' ? DEFAULT_SIGNIFICANT_DIGITS : precision;
	const decimalsToKeep = firstNonZeroIndex + (significantDigits || 0);
	const trimmedDecimalPart = decimalPart.substring(0, decimalsToKeep);

	// If precision is 0, we drop the decimal part entirely.
	if (precision === 0) {
		return integerPart;
	}

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
	precision: PrecisionOption = 2, // default precision requested
): string => {
	const numValue = parseFloat(value);

	// Handle non-numeric or special values first.
	if (isNaN(numValue)) return 'NaN';
	if (numValue === Infinity) return '∞';
	if (numValue === -Infinity) return '-∞';

	const decimalPlaces = value.split('.')[1]?.length || undefined;

	// Use custom formatter for the 'none' format honoring precision
	if (format === 'none') {
		return formatDecimalWithLeadingZeros(numValue, precision);
	}

	// For all other standard formats, delegate to grafana/data's built-in formatter.
	const computeDecimals = (): number | undefined => {
		if (precision === 'full') {
			return decimalPlaces && decimalPlaces >= DEFAULT_SIGNIFICANT_DIGITS
				? decimalPlaces
				: DEFAULT_SIGNIFICANT_DIGITS;
		}
		return precision;
	};

	const fallbackFormat = (): string => {
		if (precision === 'full') return numValue.toString();
		if (precision === 0) return Math.round(numValue).toString();
		return numValue
			.toFixed(precision)
			.replace(/(\.[0-9]*[1-9])0+$/, '$1') // trimming zeros
			.replace(/\.$/, '');
	};

	try {
		const formatter = getValueFormat(format);
		const formattedValue = formatter(numValue, computeDecimals(), undefined);
		if (formattedValue.text && formattedValue.text.includes('.')) {
			formattedValue.text = formatDecimalWithLeadingZeros(
				parseFloat(formattedValue.text),
				precision,
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
		return fallbackFormat();
	}
};

export const getToolTipValue = (
	value: string | number,
	format?: string,
	precision?: PrecisionOption,
): string =>
	getYAxisFormattedValue(value?.toString(), format || 'none', precision);
