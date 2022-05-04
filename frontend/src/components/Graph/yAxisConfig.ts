import { formattedValueToString, getValueFormat } from '@grafana/data';

export const getYAxisFormattedValue = (
	value: string,
	format: string,
): string => {
	let decimalPrecision: number | undefined;
	const parsedValue = getValueFormat(format)(
		parseFloat(value),
		undefined,
		undefined,
		undefined,
	);
	try {
		const decimalSplitted = parsedValue.text.split('.');
		if (decimalSplitted.length === 1) {
			decimalPrecision = 0;
		} else {
			const decimalDigits = decimalSplitted[1].split('');
			decimalPrecision = decimalDigits.length;
			for (let idx = 0; idx < decimalDigits.length; idx += 1) {
				if (decimalDigits[idx] !== '0') {
					decimalPrecision = idx + 1;
					break;
				}
			}
		}
		return formattedValueToString(
			getValueFormat(format)(
				parseFloat(value),
				decimalPrecision,
				undefined,
				undefined,
			),
		);
	} catch (error) {
		console.error(error);
	}
	return `${parseFloat(value)}`;
};

export const getToolTipValue = (value: string, format: string): string => {
	try {
		return formattedValueToString(
			getValueFormat(format)(parseFloat(value), undefined, undefined, undefined),
		);
	} catch (error) {
		console.error(error);
	}
	return `${value}`;
};
