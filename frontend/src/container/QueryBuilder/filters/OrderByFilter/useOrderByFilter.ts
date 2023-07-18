import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import useDebounce from 'hooks/useDebounce';
import { IOption } from 'hooks/useResourceAttribute/types';
import { uniqWith } from 'lodash-es';
import * as Papa from 'papaparse';
import { useCallback, useMemo, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { OrderByPayload } from 'types/api/queryBuilder/queryBuilderData';

import { getRemoveOrderFromValue } from '../QueryBuilderSearch/utils';
import { FILTERS } from './config';
import { OrderByFilterProps } from './OrderByFilter.interfaces';
import {
	mapLabelValuePairs,
	orderByValueDelimiter,
	splitOrderByFromString,
	transformToOrderByStringValues,
} from './utils';

type UseOrderByFilterResult = {
	searchText: string;
	debouncedSearchText: string;
	selectedValue: IOption[];
	aggregationOptions: IOption[];
	customValue: IOption[];
	createOptions: (data: BaseAutocompleteData[]) => IOption[];
	handleChange: (values: IOption[]) => void;
	handleSearchKeys: (search: string) => void;
};

export const useOrderByFilter = ({
	query,
	onChange,
}: OrderByFilterProps): UseOrderByFilterResult => {
	const [searchText, setSearchText] = useState<string>('');
	const [selectedValue, setSelectedValue] = useState<IOption[]>(
		transformToOrderByStringValues(query.orderBy),
	);

	const debouncedSearchText = useDebounce(searchText, DEBOUNCE_DELAY);

	const handleSearchKeys = useCallback(
		(searchText: string): void => setSearchText(searchText),
		[],
	);

	const getUniqValues = useCallback((values: IOption[]): IOption[] => {
		const modifiedValues = values.map((item) => {
			const match = Papa.parse(item.value, { delimiter: orderByValueDelimiter });
			if (!match) return { label: item.label, value: item.value };
			// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
			const [_, order] = match.data.flat() as string[];
			if (order)
				return {
					label: item.label,
					value: item.value,
				};

			return {
				label: `${item.value} ${FILTERS.ASC}`,
				value: `${item.value}${orderByValueDelimiter}${FILTERS.ASC}`,
			};
		});

		return uniqWith(
			modifiedValues,
			(current, next) =>
				getRemoveOrderFromValue(current.value) ===
				getRemoveOrderFromValue(next.value),
		);
	}, []);

	const getValidResult = useCallback(
		(result: IOption[]): IOption[] =>
			result.reduce<IOption[]>((acc, item) => {
				if (item.value === FILTERS.ASC || item.value === FILTERS.DESC) return acc;

				if (item.value.includes(FILTERS.ASC) || item.value.includes(FILTERS.DESC)) {
					const splittedOrderBy = splitOrderByFromString(item.value);

					if (splittedOrderBy) {
						acc.push({
							label: `${splittedOrderBy.columnName} ${splittedOrderBy.order}`,
							value: `${splittedOrderBy.columnName}${orderByValueDelimiter}${splittedOrderBy.order}`,
						});

						return acc;
					}
				}

				acc.push(item);

				return acc;
			}, []),
		[],
	);

	const handleChange = (values: IOption[]): void => {
		const validResult = getValidResult(values);
		const result = getUniqValues(validResult);

		const orderByValues: OrderByPayload[] = result.map((item) => {
			const match = Papa.parse(item.value, { delimiter: orderByValueDelimiter });

			if (!match) {
				return {
					columnName: item.value,
					order: 'asc',
				};
			}

			const [columnName, order] = match.data.flat() as string[];

			const orderValue = order ?? 'asc';

			return {
				columnName,
				order: orderValue,
			};
		});

		const selectedValue: IOption[] = orderByValues.map((item) => ({
			label: `${item.columnName} ${item.order}`,
			value: `${item.columnName}${orderByValueDelimiter}${item.order}`,
		}));

		setSelectedValue(selectedValue);

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
				label: `${query.aggregateOperator}(${query.aggregateAttribute.key}) ${FILTERS.ASC}`,
				value: `${query.aggregateOperator}(${query.aggregateAttribute.key})${orderByValueDelimiter}${FILTERS.ASC}`,
			},
			{
				label: `${query.aggregateOperator}(${query.aggregateAttribute.key}) ${FILTERS.DESC}`,
				value: `${query.aggregateOperator}(${query.aggregateAttribute.key})${orderByValueDelimiter}${FILTERS.DESC}`,
			},
		],
		[query],
	);

	const customValue: IOption[] = useMemo(() => {
		if (!searchText) return [];

		return [
			{
				label: `${searchText} ${FILTERS.ASC}`,
				value: `${searchText}${orderByValueDelimiter}${FILTERS.ASC}`,
			},
			{
				label: `${searchText} ${FILTERS.DESC}`,
				value: `${searchText}${orderByValueDelimiter}${FILTERS.DESC}`,
			},
		];
	}, [searchText]);

	return {
		searchText,
		debouncedSearchText,
		selectedValue,
		customValue,
		aggregationOptions,
		createOptions,
		handleChange,
		handleSearchKeys,
	};
};
