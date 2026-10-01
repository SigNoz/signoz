/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { IAttributeValuesResponse } from 'types/api/queryBuilder/getAttributesValues';
import type { IQueryAutocompleteResponse } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

/**
 * Typed builders for the v3 `/autocomplete/attribute_keys` and
 * `/autocomplete/attribute_values` pair, which the APM pages and the resource
 * attribute filter still read.
 */

interface AttributeKeysOptions {
	dataType?: DataTypes;
	type?: string;
}

export const attributeKeysResponse = (
	keys: readonly string[],
	{ dataType = DataTypes.String, type = 'tag' }: AttributeKeysOptions = {},
): { status: string; data: IQueryAutocompleteResponse } => ({
	status: 'success',
	data: {
		attributeKeys: keys.map((key) => ({ key, dataType, type })),
	},
});

export const attributeValuesResponse = (
	values: readonly string[],
	searchText = '',
): { status: string; data: IAttributeValuesResponse } => ({
	status: 'success',
	data: {
		stringAttributeValues: values.filter((value) =>
			value.toLowerCase().includes(searchText.toLowerCase()),
		),
		numberAttributeValues: null,
		boolAttributeValues: null,
	},
});
