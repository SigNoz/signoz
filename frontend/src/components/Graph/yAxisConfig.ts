import { formattedValueToString, getValueFormat } from '@grafana/data';

export const getYAxisFormattedValue = (
	value: number,
	format: string,
): string => {
	try {
		return formattedValueToString(
			getValueFormat(format)(value, undefined, undefined, undefined),
		);
	} catch (error) {
		console.error(error);
	}
	return `${value}`;
};
