/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	GetFieldsKeys200,
	GetFieldsValues200,
} from 'api/generated/services/sigNoz.schemas';
import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';

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
