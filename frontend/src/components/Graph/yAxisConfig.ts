import { formattedValueToString, getValueFormat } from '@grafana/data';
import { isFinite } from 'lodash-es';

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

		// Format with specified decimals (default 3)
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
