import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import useDebounce from 'hooks/useDebounce';
import { IOption } from 'hooks/useResourceAttribute/types';
import { isEqual, uniqWith } from 'lodash-es';
import { parse } from 'papaparse';
import { useCallback, useMemo, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { OrderByPayload } from 'types/api/queryBuilder/queryBuilderData';

import { getRemoveOrderFromValue } from '../QueryBuilderSearch/utils';
import { getUniqueOrderByValues, getValidOrderByResult } from '../utils';
import { ORDERBY_FILTERS } from './config';
import { SIGNOZ_VALUE } from './constants';
import { OrderByFilterProps } from './OrderByFilter.interfaces';
import {
	getLabelFromValue,
	mapLabelValuePairs,
	orderByValueDelimiter,
	transformToOrderByStringValues,
} from './utils';

export type UseOrderByFilterResult = {
	searchText: string;
	debouncedSearchText: string;
	selectedValue: IOption[];
	aggregationOptions: IOption[];
	generateOptions: (options: IOption[]) => IOption[];
	createOptions: (data: BaseAutocompleteData[]) => IOption[];
	handleChange: (values: IOption[]) => void;
	handleSearchKeys: (search: string) => void;
};

export const useOrderByFilter = ({
	query,
	onChange,
	entityVersion,
}: OrderByFilterProps): UseOrderByFilterResult => {
	const [searchText, setSearchText] = useState<string>('');

	const debouncedSearchText = useDebounce(searchText, DEBOUNCE_DELAY);

	const handleSearchKeys = useCallback(
		(searchText: string): void => setSearchText(searchText),
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

	const selectedValue = useMemo(
		() => transformToOrderByStringValues(query, entityVersion),
		[query, entityVersion],
	);

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

			return {
				columnName: columnNameValue,
				order: orderValue,
			};
		});

		setSearchText('');
		onChange(orderByValues);
	};

	const createOptions = useCallback(
		(data: BaseAutocompleteData[]): IOption[] => mapLabelValuePairs(data).flat(),
		[],
	);

	const aggregationOptions = useMemo(
		() => [
			{
				label: `${
					entityVersion === 'v4' ? query.spaceAggregation : query.aggregateOperator
				}(${query.aggregateAttribute.key}) ${ORDERBY_FILTERS.ASC}`,
				value: `${SIGNOZ_VALUE}${orderByValueDelimiter}${ORDERBY_FILTERS.ASC}`,
			},
			{
				label: `${
					entityVersion === 'v4' ? query.spaceAggregation : query.aggregateOperator
				}(${query.aggregateAttribute.key}) ${ORDERBY_FILTERS.DESC}`,
				value: `${SIGNOZ_VALUE}${orderByValueDelimiter}${ORDERBY_FILTERS.DESC}`,
			},
		],
		[query, entityVersion],
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
