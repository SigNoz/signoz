import { RadioChangeEvent } from 'antd';
import getFromLocalstorage from 'api/browser/localstorage/get';
import setToLocalstorage from 'api/browser/localstorage/set';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import { defaultOptionsQuery, URL_OPTIONS } from './constants';
import { InitialOptions, OptionsMenuConfig, OptionsQuery } from './types';
import { getInitialColumns, getOptionsFromKeys } from './utils';

interface UseOptionsMenuProps {
	dataSource: DataSource;
	aggregateOperator: string;
	initialOptions?: InitialOptions;
}

interface UseOptionsMenu {
	isLoading: boolean;
	options: OptionsQuery;
	config: OptionsMenuConfig;
}

const useOptionsMenu = ({
	dataSource,
	aggregateOperator,
	initialOptions = {},
}: UseOptionsMenuProps): UseOptionsMenu => {
	const localStorageOptionsQuery = getFromLocalstorage(
		LOCALSTORAGE.LIST_OPTIONS,
	);

	const {
		query: optionsQuery,
		queryData: optionsQueryData,
		redirectWithQuery: redirectWithOptionsData,
	} = useUrlQueryData<OptionsQuery>(URL_OPTIONS, defaultOptionsQuery);

	const { data, isFetched, isLoading } = useQuery(
		[QueryBuilderKeys.GET_ATTRIBUTE_KEY, dataSource, aggregateOperator],
		async () =>
			getAggregateKeys({
				searchText: '',
				dataSource,
				aggregateOperator,
				aggregateAttribute: '',
				tagType: null,
			}),
	);

	const attributeKeys = useMemo(() => data?.payload?.attributeKeys || [], [
		data?.payload?.attributeKeys,
	]);

	const initialOptionsQuery: OptionsQuery = useMemo(
		() => ({
			...defaultOptionsQuery,
			...initialOptions,
			selectColumns: initialOptions?.selectColumns
				? getInitialColumns(initialOptions?.selectColumns || [], attributeKeys)
				: defaultOptionsQuery.selectColumns,
		}),
		[initialOptions, attributeKeys],
	);

	const selectedColumnKeys = useMemo(
		() => optionsQueryData?.selectColumns?.map(({ id }) => id) || [],
		[optionsQueryData],
	);

	const addColumnOptions = useMemo(() => {
		const filteredAttributeKeys = attributeKeys.filter(
			(item) => item.key !== 'body',
		);

		return getOptionsFromKeys(filteredAttributeKeys, selectedColumnKeys);
	}, [attributeKeys, selectedColumnKeys]);

	const handleRedirectWithOptionsData = useCallback(
		(newQueryData: OptionsQuery) => {
			redirectWithOptionsData(newQueryData);

			setToLocalstorage(LOCALSTORAGE.LIST_OPTIONS, JSON.stringify(newQueryData));
		},
		[redirectWithOptionsData],
	);

	const handleSelectedColumnsChange = useCallback(
		(value: string[]) => {
			const newSelectedColumnKeys = [
				...new Set([...selectedColumnKeys, ...value]),
			];
			const newSelectedColumns = newSelectedColumnKeys.reduce((acc, key) => {
				const column = attributeKeys.find(({ id }) => id === key);

				if (!column) return acc;
				return [...acc, column];
			}, [] as BaseAutocompleteData[]);

			const optionsData: OptionsQuery = {
				...optionsQueryData,
				selectColumns: newSelectedColumns,
			};

			handleRedirectWithOptionsData(optionsData);
		},
		[
			selectedColumnKeys,
			optionsQueryData,
			handleRedirectWithOptionsData,
			attributeKeys,
		],
	);

	const handleRemoveSelectedColumn = useCallback(
		(columnKey: string) => {
			const newSelectedColumns = optionsQueryData?.selectColumns?.filter(
				({ id }) => id !== columnKey,
			);

			const optionsData: OptionsQuery = {
				...optionsQueryData,
				selectColumns: newSelectedColumns,
			};

			handleRedirectWithOptionsData(optionsData);
		},
		[optionsQueryData, handleRedirectWithOptionsData],
	);

	const handleFormatChange = useCallback(
		(event: RadioChangeEvent) => {
			const optionsData: OptionsQuery = {
				...optionsQueryData,
				format: event.target.value,
			};

			handleRedirectWithOptionsData(optionsData);
		},
		[handleRedirectWithOptionsData, optionsQueryData],
	);

	const handleMaxLinesChange = useCallback(
		(value: string | number | null) => {
			const optionsData: OptionsQuery = {
				...optionsQueryData,
				maxLines: value as number,
			};

			handleRedirectWithOptionsData(optionsData);
		},
		[handleRedirectWithOptionsData, optionsQueryData],
	);

	const optionsMenuConfig: Required<OptionsMenuConfig> = useMemo(
		() => ({
			addColumn: {
				value: optionsQueryData.selectColumns || defaultOptionsQuery.selectColumns,
				options: addColumnOptions || [],
				onChange: handleSelectedColumnsChange,
				onRemove: handleRemoveSelectedColumn,
			},
			format: {
				value: optionsQueryData.format || defaultOptionsQuery.format,
				onChange: handleFormatChange,
			},
			maxLines: {
				value: optionsQueryData.maxLines || defaultOptionsQuery.maxLines,
				onChange: handleMaxLinesChange,
			},
		}),
		[
			addColumnOptions,
			optionsQueryData?.maxLines,
			optionsQueryData?.format,
			optionsQueryData?.selectColumns,
			handleSelectedColumnsChange,
			handleRemoveSelectedColumn,
			handleFormatChange,
			handleMaxLinesChange,
		],
	);

	useEffect(() => {
		if (optionsQuery || !isFetched) return;

		const nextOptionsQuery = localStorageOptionsQuery
			? JSON.parse(localStorageOptionsQuery)
			: initialOptionsQuery;

		redirectWithOptionsData(nextOptionsQuery);
	}, [
		isFetched,
		optionsQuery,
		initialOptionsQuery,
		redirectWithOptionsData,
		localStorageOptionsQuery,
	]);

	return {
		isLoading,
		options: optionsQueryData,
		config: optionsMenuConfig,
	};
};

export default useOptionsMenu;
