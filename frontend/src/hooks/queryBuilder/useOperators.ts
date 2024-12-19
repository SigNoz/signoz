import {
	OPERATORS,
	QUERY_BUILDER_OPERATORS_BY_TYPES,
} from 'constants/queryBuilder';
import { getRemovePrefixFromKey } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useMemo } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

type IOperators =
	| typeof QUERY_BUILDER_OPERATORS_BY_TYPES.universal
	| typeof QUERY_BUILDER_OPERATORS_BY_TYPES.string
	| typeof QUERY_BUILDER_OPERATORS_BY_TYPES.bool
	| typeof QUERY_BUILDER_OPERATORS_BY_TYPES.int64
	| typeof QUERY_BUILDER_OPERATORS_BY_TYPES.float64;

export const useOperators = (
	key: string,
	keys: BaseAutocompleteData[],
): IOperators =>
	useMemo(() => {
		const currentKey = keys?.find((el) => el.key === getRemovePrefixFromKey(key));
		const strippedKey = key.split(' ')[0];

		// eslint-disable-next-line no-nested-ternary
		return currentKey?.dataType
			? QUERY_BUILDER_OPERATORS_BY_TYPES[
					currentKey.dataType as keyof typeof QUERY_BUILDER_OPERATORS_BY_TYPES
			  ]
			: strippedKey.endsWith('[*]') && strippedKey.startsWith('body.')
			? [OPERATORS.HAS, OPERATORS.NHAS]
			: QUERY_BUILDER_OPERATORS_BY_TYPES.universal;
	}, [keys, key]);
