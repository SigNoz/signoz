import type { GetFieldsKeys200 } from 'api/generated/services/sigNoz.schemas/getFieldsKeys200';
import type { GetFieldsValues200 } from 'api/generated/services/sigNoz.schemas/getFieldsValues200';
import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas/telemetrytypesFieldContextDTO';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas/telemetrytypesSignalDTO';

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
