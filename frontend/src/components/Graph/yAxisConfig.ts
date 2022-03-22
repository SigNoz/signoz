import { formattedValueToString, getValueFormat } from '@grafana/data';

export const getYAxisFormattedValue = (
	value: number | string,
	format: string,
): string => {
	try {
		return formattedValueToString(
			getValueFormat(format)(
				parseInt(value.toString(), 10),
				undefined,
				undefined,
				undefined,
			),
		);
	} catch (error) {
		console.error(error);
	}
	return `${value}`;
};
