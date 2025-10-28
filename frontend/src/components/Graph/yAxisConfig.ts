import { formattedValueToString, getValueFormat } from '@grafana/data';
import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';

import { formatUniversalUnit } from '../YAxisUnitSelector/formatter';

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
			let nonZeroCtr = 0;
			for (let idx = 0; idx < decimalDigits.length; idx += 1) {
				if (decimalDigits[idx] !== '0') {
					nonZeroCtr += 1;
					if (nonZeroCtr >= 2) {
						decimalPrecision = idx + 1;
					}
				} else if (nonZeroCtr) {
					decimalPrecision = idx;
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

function isUniversalUnit(format: string): boolean {
	return Object.values(UniversalYAxisUnit).includes(
		format as UniversalYAxisUnit,
	);
}

export const getToolTipValue = (value: string, format?: string): string => {
	try {
		// Separate logic for universal units
		if (format && isUniversalUnit(format)) {
			return formatUniversalUnit(parseFloat(value), format as UniversalYAxisUnit);
		}

		return formattedValueToString(
			getValueFormat(format)(parseFloat(value), undefined, undefined, undefined),
		);
	} catch (error) {
		console.error(error);
	}
	return `${value}`;
};
