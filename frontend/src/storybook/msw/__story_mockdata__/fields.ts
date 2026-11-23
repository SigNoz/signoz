/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { GetFieldsKeys200 } from 'api/generated/services/sigNoz.schemas/getFieldsKeys200';
import type { GetFieldsValues200 } from 'api/generated/services/sigNoz.schemas/getFieldsValues200';
import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas/telemetrytypesFieldContextDTO';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas/telemetrytypesSignalDTO';

/** Typed builders for the `/fields/keys` and `/fields/values` responses. */

interface FieldKeysOptions {
	signal?: TelemetrytypesSignalDTO;
	fieldContext?: TelemetrytypesFieldContextDTO;
}

/**
 * `keys` is a map from field name to every context that name was seen in, so a
 * single-context key is a one-entry array under its own name.
 */
export const fieldKeysResponse = (
	names: readonly string[],
	{
		signal = TelemetrytypesSignalDTO.metrics,
		fieldContext = TelemetrytypesFieldContextDTO.resource,
	}: FieldKeysOptions = {},
): GetFieldsKeys200 => ({
	status: 'success',
	data: {
		complete: true,
		keys: Object.fromEntries(
			names.map((name) => [name, [{ name, signal, fieldContext }]]),
		),
	},
});

export const fieldValuesResponse = (
	values: readonly string[],
): GetFieldsValues200 => ({
	status: 'success',
	data: {
		complete: true,
		values: { stringValues: [...values], relatedValues: [...values] },
	},
});
