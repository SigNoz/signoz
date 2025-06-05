import { formattedValueToString, getValueFormat } from '@grafana/data';
import { UniversalUnitToGrafanaUnit } from 'components/YAxisUnitSelector/constants';
import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';

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

export const getToolTipValue = (
	value: string,
	format?: string,
	usingUniversalUnits?: boolean,
): string => {
	const universalMappingExists =
		usingUniversalUnits && format && format in UniversalUnitToGrafanaUnit;
	const universalMappingNotFound =
		usingUniversalUnits && format && !(format in UniversalUnitToGrafanaUnit);

	let processedFormat = universalMappingExists
		? UniversalUnitToGrafanaUnit[format as UniversalYAxisUnit]
		: format;
	// If using universal units but a compatible mapping is not found, use `short` for numeric formatting
	if (universalMappingNotFound) {
		processedFormat = 'short';
	}
	try {
		return (
			formattedValueToString(
				getValueFormat(processedFormat)(
					parseFloat(value),
					undefined,
					undefined,
					undefined,
				),
			) + (universalMappingNotFound ? ` ${format}` : '')
		);
	} catch (error) {
		console.error(error);
	}
	return `${value}`;
};
