import { AttributeKeyOptions } from 'api/queryBuilder/getAttributesKeysValues';
import { Option } from 'container/QueryBuilder/type';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useOperators } from './useOperators';

export const useOptions = (
	key: string,
	keys: AttributeKeyOptions[],
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
					? [{ value: searchValue }, ...keys.map((k) => ({ value: k.key }))]
					: keys?.map((k) => ({ value: k.key })),
			);
		} else if (key && !operator) {
			setOptions(
				operators.map((o) => ({
					value: `${key} ${o}`,
					label: `${key} ${o.replace('_', ' ')}`,
				})),
			);
		} else if (key && operator) {
			if (isMulti) {
				setOptions(results.map((r) => ({ value: `${r}` })));
			} else if (isExist) {
				setOptions([]);
			} else if (isValidOperator) {
				const hasAllResults = result.every((val) => results.includes(val));
				const values = results.map((r) => ({
					value: `${key} ${operator} ${r}`,
				}));
				const options = hasAllResults
					? values
					: [{ value: searchValue }, ...values];
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
