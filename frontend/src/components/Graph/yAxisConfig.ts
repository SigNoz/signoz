import { formattedValueToString, getValueFormat } from '@grafana/data';

export const getYAxisFormattedValue = (
	value: string,
	format: string,
): string => {
	let numberValue: number = parseInt(value, 10);
	let decimalPrecision: number | undefined;
	try {
		const decimalSplitted = value.split('.');
		if (decimalSplitted.length === 1) {
			decimalPrecision = 0;
		} else {
			const decimalDigits = decimalSplitted[1].split('');
			decimalPrecision = decimalDigits.length;
			let nonZeroCtr = 0;
			for (let idx = 0; idx < decimalDigits.length; idx += 1) {
				if (decimalDigits[idx] !== '0') {
					nonZeroCtr += 1;
					if (nonZeroCtr >= 2) {
						decimalPrecision = idx + 1;
						break;
					}
				}
			}
			numberValue = parseFloat(value);
		}
		return formattedValueToString(
			getValueFormat(format)(numberValue, decimalPrecision, undefined, undefined),
		);
	} catch (error) {
		console.error(error);
	}
	return `${numberValue}`;
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
