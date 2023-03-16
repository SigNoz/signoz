import { KeyType, Option } from 'container/QueryBuilder/type';
import { useEffect, useMemo, useState } from 'react';

import { useOperators } from './useOperators';

export const useOptions = (
	key: string,
	keys: KeyType[],
	operator: string,
	searchValue: string,
	isMulti: boolean,
	isValidOperator: boolean,
	isExist: boolean,
	results: string[],
): Option[] => {
	const [options, setOptions] = useState<Option[]>([]);
	const operators = useOperators(key, keys);

	useEffect(() => {
		if (!key) {
			setOptions(
				searchValue
					? [{ value: searchValue }, ...keys.map((k) => ({ value: k.key }))]
					: keys.map((k) => ({ value: k.key })),
			);
		} else if (key && !operator) {
			setOptions(
				operators.map((o) => ({
					value: `${key} ${o}`,
					label: `${key} ${o.replace('_', ' ')}`,
				})),
			);
		} else if (key && operator && isMulti) {
			setOptions(results.map((r) => ({ value: `${r}` })));
		} else if (key && operator && !isMulti && !isExist && isValidOperator) {
			setOptions(results.map((r) => ({ value: `${key} ${operator} ${r}` })));
		} else if (key && operator && isExist && !isMulti) {
			setOptions([]);
		}
	}, [
		isExist,
		isMulti,
		isValidOperator,
		key,
		keys,
		operator,
		operators,
		results,
		searchValue,
	]);

	return useMemo(
		() =>
			options.map((option) => {
				if (isMulti) {
					return { ...option, selected: searchValue.includes(option.value) };
				}
				return option;
			}),
		[isMulti, options, searchValue],
	);
};
