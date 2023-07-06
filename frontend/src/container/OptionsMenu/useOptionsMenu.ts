import { RadioChangeEvent } from 'antd';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import { useNotifications } from 'hooks/useNotifications';
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
	const { notifications } = useNotifications();

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

	const addColumnOptions = useMemo(
		() => getOptionsFromKeys(attributeKeys, selectedColumnKeys),
		[attributeKeys, selectedColumnKeys],
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

			redirectWithOptionsData({
				...optionsQueryData,
				selectColumns: newSelectedColumns,
			});
		},
		[
			selectedColumnKeys,
			redirectWithOptionsData,
			optionsQueryData,
			attributeKeys,
		],
	);

	const handleRemoveSelectedColumn = useCallback(
		(columnKey: string) => {
			const newSelectedColumns = optionsQueryData?.selectColumns?.filter(
				({ id }) => id !== columnKey,
			);

			if (!newSelectedColumns.length) {
				notifications.error({
					message: 'There must be at least one selected column',
				});
			} else {
				redirectWithOptionsData({
					...defaultOptionsQuery,
					selectColumns: newSelectedColumns,
				});
			}
		},
		[optionsQueryData, notifications, redirectWithOptionsData],
	);

	const handleFormatChange = useCallback(
		(event: RadioChangeEvent) => {
			redirectWithOptionsData({
				...optionsQueryData,
				format: event.target.value,
			});
		},
		[optionsQueryData, redirectWithOptionsData],
	);

	const handleMaxLinesChange = useCallback(
		(value: string | number | null) => {
			redirectWithOptionsData({
				...optionsQueryData,
				maxLines: value as number,
			});
		},
		[optionsQueryData, redirectWithOptionsData],
	);

	const optionsMenuConfig: Required<OptionsMenuConfig> = useMemo(
		() => ({
			addColumn: {
				value: optionsQueryData?.selectColumns || defaultOptionsQuery.selectColumns,
				options: addColumnOptions || [],
				onChange: handleSelectedColumnsChange,
				onRemove: handleRemoveSelectedColumn,
			},
			format: {
				value: optionsQueryData?.format || defaultOptionsQuery.format,
				onChange: handleFormatChange,
			},
			maxLines: {
				value: optionsQueryData?.maxLines || defaultOptionsQuery.maxLines,
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

		redirectWithOptionsData(initialOptionsQuery);
	}, [isFetched, optionsQuery, initialOptionsQuery, redirectWithOptionsData]);

	return {
		isLoading,
		options: optionsQueryData,
		config: optionsMenuConfig,
	};
};

export default useOptionsMenu;
