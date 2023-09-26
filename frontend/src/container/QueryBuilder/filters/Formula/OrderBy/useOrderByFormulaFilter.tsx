import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import useDebounce from 'hooks/useDebounce';
import { IOption } from 'hooks/useResourceAttribute/types';
import isEqual from 'lodash-es/isEqual';
import uniqWith from 'lodash-es/uniqWith';
import { parse } from 'papaparse';
import { useCallback, useMemo, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { OrderByPayload } from 'types/api/queryBuilder/queryBuilderData';

import { ORDERBY_FILTERS } from '../../OrderByFilter/config';
import { SIGNOZ_VALUE } from '../../OrderByFilter/constants';
import { UseOrderByFilterResult } from '../../OrderByFilter/useOrderByFilter';
import {
	getLabelFromValue,
	mapLabelValuePairs,
	orderByValueDelimiter,
} from '../../OrderByFilter/utils';
import { getRemoveOrderFromValue } from '../../QueryBuilderSearch/utils';
import { getUniqueOrderByValues, getValidOrderByResult } from '../../utils';
import { IOrderByFormulaFilterProps } from './types';
import { transformToOrderByStringValuesByFormula } from './utils';

export const useOrderByFormulaFilter = ({
	onChange,
	formula,
}: IOrderByFormulaFilterProps): UseOrderByFilterResult => {
	const [searchText, setSearchText] = useState<string>('');

	const debouncedSearchText = useDebounce(searchText, DEBOUNCE_DELAY);

	const handleSearchKeys = useCallback(
		(searchText: string): void => setSearchText(searchText),
		[],
	);

	const handleChange = (values: IOption[]): void => {
		const validResult = getValidOrderByResult(values);
		const result = getUniqueOrderByValues(validResult);

		const orderByValues: OrderByPayload[] = result.map((item) => {
			const match = parse(item.value, { delimiter: orderByValueDelimiter });

			if (!match) {
				return {
					columnName: item.value,
					order: 'asc',
				};
			}

			const [columnName, order] = match.data.flat() as string[];

			const columnNameValue =
				columnName === SIGNOZ_VALUE ? SIGNOZ_VALUE : columnName;

			const orderValue = order ?? 'asc';

			console.log({ columnNameValue, orderValue });

			return {
				columnName: columnNameValue,
				order: orderValue,
			};
		});

		setSearchText('');
		onChange(orderByValues);
	};

	const aggregationOptions = useMemo(
		() => [
			{
				label: `${formula.expression} ${ORDERBY_FILTERS.ASC}`,
				value: `${SIGNOZ_VALUE}${orderByValueDelimiter}${ORDERBY_FILTERS.ASC}`,
			},
			{
				label: `${formula.expression} ${ORDERBY_FILTERS.DESC}`,
				value: `${SIGNOZ_VALUE}${orderByValueDelimiter}${ORDERBY_FILTERS.DESC}`,
			},
		],
		[formula],
	);

	const selectedValue = transformToOrderByStringValuesByFormula(formula);

	const createOptions = useCallback(
		(data: BaseAutocompleteData[]): IOption[] => mapLabelValuePairs(data).flat(),
		[],
	);

	const customValue: IOption[] = useMemo(() => {
		if (!searchText) return [];

		return [
			{
				label: `${searchText} ${ORDERBY_FILTERS.ASC}`,
				value: `${searchText}${orderByValueDelimiter}${ORDERBY_FILTERS.ASC}`,
			},
			{
				label: `${searchText} ${ORDERBY_FILTERS.DESC}`,
				value: `${searchText}${orderByValueDelimiter}${ORDERBY_FILTERS.DESC}`,
			},
		];
	}, [searchText]);

	const generateOptions = useCallback(
		(options: IOption[]): IOption[] => {
			const currentCustomValue = options.find(
				(keyOption) =>
					getRemoveOrderFromValue(keyOption.value) === debouncedSearchText,
			)
				? []
				: customValue;

			const result = [...currentCustomValue, ...options];

			const uniqResult = uniqWith(result, isEqual);

			return uniqResult.filter(
				(option) =>
					!getLabelFromValue(selectedValue).includes(
						getRemoveOrderFromValue(option.value),
					),
			);
		},
		[customValue, debouncedSearchText, selectedValue],
	);

	return {
		searchText,
		debouncedSearchText,
		selectedValue,
		aggregationOptions,
		createOptions,
		handleChange,
		handleSearchKeys,
		generateOptions,
	};
};
