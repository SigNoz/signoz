import { AttributeKeyOptions } from 'api/queryBuilder/getAttributesKeysValues';
import { QUERY_BUILDER_OPERATORS_BY_TYPES } from 'constants/queryBuilder';
import { useMemo } from 'react';

type IOperators =
	| typeof QUERY_BUILDER_OPERATORS_BY_TYPES.universal
	| typeof QUERY_BUILDER_OPERATORS_BY_TYPES.string
	| typeof QUERY_BUILDER_OPERATORS_BY_TYPES.boolean
	| typeof QUERY_BUILDER_OPERATORS_BY_TYPES.number;

export const useOperators = (
	key: string,
	keys: AttributeKeyOptions[],
): IOperators =>
	useMemo(() => {
		const currentKey = keys?.find((el) => el.key === key);
		return currentKey
			? QUERY_BUILDER_OPERATORS_BY_TYPES[currentKey.dataType]
			: QUERY_BUILDER_OPERATORS_BY_TYPES.universal;
	}, [keys, key]);
