import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import useDebounce from 'hooks/useDebounce';
import { IOption } from 'hooks/useResourceAttribute/types';
import { isEqual, uniqWith } from 'lodash-es';
import * as Papa from 'papaparse';
import { useCallback, useMemo, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { OrderByPayload } from 'types/api/queryBuilder/queryBuilderData';

import { getRemoveOrderFromValue } from '../QueryBuilderSearch/utils';
import { FILTERS } from './config';
import { SIGNOZ_VALUE } from './constants';
import { OrderByFilterProps } from './OrderByFilter.interfaces';
import {
	getLabelFromValue,
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
	generateOptions: (options: IOption[]) => IOption[];
	createOptions: (data: BaseAutocompleteData[]) => IOption[];
	handleChange: (values: IOption[]) => void;
	handleSearchKeys: (search: string) => void;
};

export const useOrderByFilter = ({
	query,
	onChange,
}: OrderByFilterProps): UseOrderByFilterResult => {
	const [searchText, setSearchText] = useState<string>('');

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

	const selectedValue = useMemo(() => transformToOrderByStringValues(query), [
		query,
	]);

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
				label: `${query.aggregateOperator}(${query.aggregateAttribute.key}) ${FILTERS.ASC}`,
				value: `${SIGNOZ_VALUE}${orderByValueDelimiter}${FILTERS.ASC}`,
			},
			{
				label: `${query.aggregateOperator}(${query.aggregateAttribute.key}) ${FILTERS.DESC}`,
				value: `${SIGNOZ_VALUE}${orderByValueDelimiter}${FILTERS.DESC}`,
			},
		],
		[query],
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
