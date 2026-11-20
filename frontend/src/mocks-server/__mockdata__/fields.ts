import type {
	GetFieldsKeys200,
	GetFieldsValues200,
} from 'api/generated/services/sigNoz.schemas';
import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';

export const metricFieldKeysResponse = (names: string[]): GetFieldsKeys200 => ({
	status: 'success',
	data: {
		complete: true,
		keys: Object.fromEntries(
			names.map((name) => [
				name,
				[
					{
						name,
						signal: TelemetrytypesSignalDTO.metrics,
						fieldContext: TelemetrytypesFieldContextDTO.attribute,
					},
				],
			]),
		),
	},
});

export const fieldStringValuesResponse = (
	values: string[],
): GetFieldsValues200 => ({
	status: 'success',
	data: { complete: true, values: { stringValues: values } },
});
