import { Option } from 'container/QueryBuilder/type';
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

	const updateOptions = useCallback(() => {
		if (!key) {
			setOptions(
				searchValue
					? [
							{ label: `${searchValue} `, value: `${searchValue} ` },
							...keys.map((k) => ({ label: k.key, value: k.key })),
					  ]
					: keys?.map((k) => ({ label: k.key, value: k.key })),
			);
		} else if (key && !operator) {
			setOptions(
				operators?.map((o) => ({
					value: `${key} ${o} `,
					label: `${key} ${o.replace('_', ' ')} `,
				})),
			);
		} else if (key && operator) {
			if (isMulti) {
				setOptions(results.map((r) => ({ label: `${r}`, value: `${r}` })));
			} else if (isExist) {
				setOptions([]);
			} else if (isValidOperator) {
				const hasAllResults = result.every((val) => results.includes(val));
				const values = results.map((r) => ({
					label: `${key} ${operator} ${r}`,
					value: `${key} ${operator} ${r}`,
				}));
				const options = hasAllResults
					? values
					: [{ label: searchValue, value: searchValue }, ...values];
				setOptions(options);
			}
		}
	}, [
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

	useEffect(() => {
		updateOptions();
	}, [updateOptions]);

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
