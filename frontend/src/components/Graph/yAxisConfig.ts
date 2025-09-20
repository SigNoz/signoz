import { formattedValueToString, getValueFormat } from '@grafana/data';
import { isFinite } from 'lodash-es';

const formatWithCustomDecimals = (numValue: number, decimals = 3): string => {
	const isNegative = numValue < 0;
	const absValue = Math.abs(numValue);
	const numStr = absValue.toFixed(20);

	// Find the index of the decimal point
	const decimalIndex = numStr.indexOf('.');
	if (decimalIndex === -1) {
		// No decimal point, return the integer part
		return isNegative ? `-${absValue}` : numStr;
	}

	// Find the index of the first non-zero digit after the decimal point
	const firstNonZero = numStr.substring(decimalIndex + 1).search(/[^0]/);
	const firstNonZeroIndex =
		firstNonZero === -1 ? numStr.length : decimalIndex + 1 + firstNonZero;

	// If no non-zero digit found after the decimal, return the integer part
	if (firstNonZeroIndex >= numStr.length) {
		return isNegative
			? `-${numStr.substring(0, decimalIndex)}`
			: numStr.substring(0, decimalIndex);
	}

	// Calculate the number of decimal places to keep
	const places = firstNonZeroIndex - decimalIndex - 1 + decimals;
	let formatted = absValue.toFixed(places);

	// Remove trailing zeros manually to avoid scientific notation conversion
	formatted = formatted.replace(/0+$/, '').replace(/\.$/, '');

	return isNegative ? `-${formatted}` : formatted;
};

export const getYAxisFormattedValue = (
	value: string,
	format: string,
	decimals = 3,
): string => {
	try {
		const numValue = parseFloat(value);

		// Handle special values
		if (!isFinite(numValue)) {
			if (numValue === Infinity) return '∞';
			if (numValue === -Infinity) return '-∞';
			return 'NaN';
		}

		const formatter = getValueFormat(format);

		// For 'none' format, apply custom decimal logic
		if (format === 'none') {
			if (numValue === 0) {
				return '0';
			}
			return formatWithCustomDecimals(numValue, decimals);
		}

		// Format with specified decimals (default 3) for other formats
		const formattedValue = formatter(numValue, decimals);

		// Remove unnecessary trailing zeros by parsing and converting back
		const cleanText = parseFloat(formattedValue.text).toString();

		return formattedValueToString({
			...formattedValue,
			text: cleanText,
		});
	} catch (error) {
		console.error(error);
	}
	return `${parseFloat(value)}`;
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
