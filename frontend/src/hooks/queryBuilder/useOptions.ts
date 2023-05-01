import { Option } from 'container/QueryBuilder/type';
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { useOperators } from './useOperators';

export const useOptions = (
	key: string,
	keys: BaseAutocompleteData[],
	operator: string,
	searchValue: string,
	isMulti: boolean,
	isValidOperator: boolean,
	isExist: boolean,
	results: string[],
	result: string[],
): Option[] => {
	const [options, setOptions] = useState<Option[]>([]);
	const operators = useOperators(key, keys);

	const getLabel = useCallback(
		(data: BaseAutocompleteData): Option['label'] =>
			transformStringWithPrefix({
				str: data?.key,
				prefix: data?.type || '',
				condition: !data?.isColumn,
			}),
		[],
	);

	const getOptionsFromKeys = useCallback(
		(items: BaseAutocompleteData[]): Option[] =>
			items?.map((item) => ({
				label: `${getLabel(item)} `,
				value: item.key,
			})),
		[getLabel],
	);

	useEffect(() => {
		if (!key) {
			setOptions(
				searchValue
					? [
							{ label: `${searchValue} `, value: `${searchValue} ` },
							...getOptionsFromKeys(keys),
					  ]
					: getOptionsFromKeys(keys),
			);
		} else if (key && !operator) {
			setOptions(
				operators?.map((operator) => ({
					value: `${key} ${operator} `,
					label: `${key} ${operator.replace('_', ' ')} `,
				})),
			);
		} else if (key && operator) {
			if (isMulti) {
				setOptions(
					results.map((value) => ({ label: `${value}`, value: `${value}` })),
				);
			} else if (isExist) {
				setOptions([]);
			} else if (isValidOperator) {
				const hasAllResults = result.every((value) => results.includes(value));
				const values = results.map((value) => ({
					label: `${key} ${operator} ${value}`,
					value: `${key} ${operator} ${value}`,
				}));
				const options = hasAllResults
					? values
					: [{ label: searchValue, value: searchValue }, ...values];
				setOptions(options);
			}
		}
	}, [
		getOptionsFromKeys,
		isExist,
		isMulti,
		isValidOperator,
		key,
		keys,
		operator,
		operators,
		result,
		results,
		searchValue,
	]);

	return useMemo(
		() =>
			options?.map((option) => {
				if (isMulti) {
					return { ...option, selected: searchValue.includes(option.value) };
				}
				return option;
			}),
		[isMulti, options, searchValue],
	);
};
