import { RadioChangeEvent } from 'antd';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { useCallback, useEffect, useMemo } from 'react';
import { useQueries, useQuery } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	BaseAutocompleteData,
	IQueryAutocompleteResponse,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import { defaultOptionsQuery, URL_OPTIONS } from './constants';
import { InitialOptions, OptionsMenuConfig, OptionsQuery } from './types';
import { getOptionsFromKeys } from './utils';

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
	const initialQueryParams = useMemo(
		() => ({
			searchText: '',
			aggregateAttribute: '',
			tagType: null,
			dataSource,
			aggregateOperator,
		}),
		[dataSource, aggregateOperator],
	);

	const { notifications } = useNotifications();

	const {
		query: optionsQuery,
		queryData: optionsQueryData,
		redirectWithQuery: redirectWithOptionsData,
	} = useUrlQueryData<OptionsQuery>(URL_OPTIONS, defaultOptionsQuery);

	const initialQueries = useMemo(
		() =>
			initialOptions?.selectColumns?.map((column) => ({
				queryKey: column,
				queryFn: (): Promise<
					SuccessResponse<IQueryAutocompleteResponse> | ErrorResponse
				> =>
					getAggregateKeys({
						...initialQueryParams,
						searchText: column,
					}),
				enabled: !!column && !optionsQuery,
			})) || [],
		[initialOptions?.selectColumns, initialQueryParams, optionsQuery],
	);
	const initialAttributesResult = useQueries(initialQueries);

	const isFetchedInitialAttributes = useMemo(
		() => initialAttributesResult.every((result) => result.isFetched),
		[initialAttributesResult],
	);
	const initialSelectedColumns = useMemo(() => {
		if (!isFetchedInitialAttributes) return [];

		const attributesData = initialAttributesResult?.reduce(
			(acc, attributeResponse) => {
				const data = attributeResponse?.data?.payload?.attributeKeys || [];

				return [...acc, ...data];
			},
			[] as BaseAutocompleteData[],
		);

		return (
			(initialOptions.selectColumns
				?.map((column) => attributesData.find(({ key }) => key === column))
				.filter(Boolean) as BaseAutocompleteData[]) || []
		);
	}, [
		isFetchedInitialAttributes,
		initialOptions?.selectColumns,
		initialAttributesResult,
	]);

	const { data: attributesData, isLoading } = useQuery(
		[QueryBuilderKeys.GET_ATTRIBUTE_KEY, dataSource, aggregateOperator],
		async () =>
			getAggregateKeys({
				...initialQueryParams,
				searchText: '',
			}),
	);

	const attributeKeys = useMemo(
		() => attributesData?.payload?.attributeKeys || [],
		[attributesData?.payload?.attributeKeys],
	);

	const initialOptionsQuery: OptionsQuery = useMemo(
		() => ({
			...defaultOptionsQuery,
			...initialOptions,
			selectColumns: initialOptions?.selectColumns
				? initialSelectedColumns
				: defaultOptionsQuery.selectColumns,
		}),
		[initialOptions, initialSelectedColumns],
	);

	const selectedColumnKeys = useMemo(
		() => optionsQueryData?.selectColumns?.map(({ id }) => id) || [],
		[optionsQueryData],
	);

	const optionsFromAttributeKeys = useMemo(
		() => getOptionsFromKeys(attributeKeys, selectedColumnKeys),
		[attributeKeys, selectedColumnKeys],
	);

	const handleSelectColumns = useCallback(
		(value: string) => {
			const newSelectedColumnKeys = [...new Set([...selectedColumnKeys, value])];
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
				options: optionsFromAttributeKeys,
				onSelect: handleSelectColumns,
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
			optionsFromAttributeKeys,
			optionsQueryData?.maxLines,
			optionsQueryData?.format,
			optionsQueryData?.selectColumns,
			handleSelectColumns,
			handleRemoveSelectedColumn,
			handleFormatChange,
			handleMaxLinesChange,
		],
	);

	useEffect(() => {
		if (optionsQuery || !isFetchedInitialAttributes) return;

		redirectWithOptionsData(initialOptionsQuery);
	}, [
		isFetchedInitialAttributes,
		optionsQuery,
		initialOptionsQuery,
		redirectWithOptionsData,
	]);

	return {
		isLoading,
		options: optionsQueryData,
		config: optionsMenuConfig,
	};
};

export default useOptionsMenu;
