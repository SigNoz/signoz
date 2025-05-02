import getFromLocalstorage from 'api/browser/localstorage/get';
import setToLocalstorage from 'api/browser/localstorage/set';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { LOCALSTORAGE } from 'constants/localStorage';
import { LogViewMode } from 'container/LogsTable';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import useDebounce from 'hooks/useDebounce';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQueryData from 'hooks/useUrlQueryData';
import {
	AllTraceFilterKeys,
	AllTraceFilterKeyValue,
} from 'pages/TracesExplorer/Filter/filterUtils';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueries } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	BaseAutocompleteData,
	IQueryAutocompleteResponse,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import {
	defaultLogsSelectedColumns,
	defaultOptionsQuery,
	defaultTraceSelectedColumns,
	URL_OPTIONS,
} from './constants';
import {
	FontSize,
	InitialOptions,
	OptionsMenuConfig,
	OptionsQuery,
} from './types';
import { getOptionsFromKeys } from './utils';

interface UseOptionsMenuProps {
	dataSource: DataSource;
	aggregateOperator: string;
	initialOptions?: InitialOptions;
	storageKey: LOCALSTORAGE;
}

interface UseOptionsMenu {
	options: OptionsQuery;
	config: OptionsMenuConfig;
	handleOptionsChange: (newQueryData: OptionsQuery) => void;
}

const useOptionsMenu = ({
	storageKey,
	dataSource,
	aggregateOperator,
	initialOptions = {},
}: UseOptionsMenuProps): UseOptionsMenu => {
	const { notifications } = useNotifications();

	const [searchText, setSearchText] = useState<string>('');
	const [isFocused, setIsFocused] = useState<boolean>(false);
	const debouncedSearchText = useDebounce(searchText, 300);

	const localStorageOptionsQuery = useMemo(
		() => getFromLocalstorage(storageKey),
		[storageKey],
	);

	const initialQueryParams = useMemo(
		() => ({
			searchText: '',
			aggregateAttribute: '',
			tagType: undefined,
			dataSource,
			aggregateOperator,
		}),
		[dataSource, aggregateOperator],
	);

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

		let initialSelected = initialOptions.selectColumns
			?.map((column) => attributesData.find(({ key }) => key === column))
			.filter(Boolean) as BaseAutocompleteData[];

		if (dataSource === DataSource.TRACES) {
			initialSelected = initialSelected
				?.map((col) => {
					if (col && Object.keys(AllTraceFilterKeyValue).includes(col?.key)) {
						const metaData = defaultTraceSelectedColumns.find(
							(coln) => coln.key === (col.key as AllTraceFilterKeys),
						);

						return {
							...metaData,
							key: metaData?.key,
							dataType: metaData?.dataType,
							type: metaData?.type,
							isColumn: metaData?.isColumn,
							isJSON: metaData?.isJSON,
							id: metaData?.id,
						};
					}
					return col;
				})
				.filter(Boolean) as BaseAutocompleteData[];

			// this is the last point where we can set the default columns and if uptil now also we have an empty array then we will set the default columns
			if (!initialSelected || !initialSelected?.length) {
				initialSelected = defaultTraceSelectedColumns;
			}
		}

		return initialSelected || [];
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		isFetchedInitialAttributes,
		initialOptions?.selectColumns,
		initialAttributesResult,
		dataSource,
	]);

	const {
		data: searchedAttributesData,
		isFetching: isSearchedAttributesFetching,
	} = useGetAggregateKeys(
		{
			...initialQueryParams,
			searchText: debouncedSearchText,
		},
		{ queryKey: [debouncedSearchText, isFocused], enabled: isFocused },
	);

	const searchedAttributeKeys = useMemo(() => {
		if (searchedAttributesData?.payload?.attributeKeys?.length) {
			if (dataSource === DataSource.LOGS) {
				// add timestamp and body to the list of attributes
				return [
					...defaultLogsSelectedColumns,
					...searchedAttributesData.payload.attributeKeys.filter(
						(attribute) => attribute.key !== 'body',
					),
				];
			}
			return searchedAttributesData.payload.attributeKeys;
		}
		if (dataSource === DataSource.TRACES) {
			return defaultTraceSelectedColumns;
		}

		return [];
	}, [dataSource, searchedAttributesData?.payload?.attributeKeys]);

	const initialOptionsQuery: OptionsQuery = useMemo(
		() => ({
			...defaultOptionsQuery,
			...initialOptions,
			// eslint-disable-next-line no-nested-ternary
			selectColumns: initialOptions?.selectColumns
				? initialSelectedColumns
				: dataSource === DataSource.TRACES
				? defaultTraceSelectedColumns
				: defaultOptionsQuery.selectColumns,
		}),
		[dataSource, initialOptions, initialSelectedColumns],
	);

	const selectedColumnKeys = useMemo(
		() => optionsQueryData?.selectColumns?.map(({ id }) => id) || [],
		[optionsQueryData],
	);

	const optionsFromAttributeKeys = useMemo(() => {
		const filteredAttributeKeys = searchedAttributeKeys.filter((item) => {
			// For other data sources, only filter out 'body' if it exists
			if (dataSource !== DataSource.LOGS) {
				return item.key !== 'body';
			}
			// For LOGS, keep all keys
			return true;
		});

		return getOptionsFromKeys(filteredAttributeKeys, selectedColumnKeys);
	}, [dataSource, searchedAttributeKeys, selectedColumnKeys]);

	const handleRedirectWithOptionsData = useCallback(
		(newQueryData: OptionsQuery) => {
			redirectWithOptionsData(newQueryData);

			setToLocalstorage(storageKey, JSON.stringify(newQueryData));
		},
		[storageKey, redirectWithOptionsData],
	);

	const handleSelectColumns = useCallback(
		(value: string) => {
			const newSelectedColumnKeys = [...new Set([...selectedColumnKeys, value])];
			const newSelectedColumns = newSelectedColumnKeys.reduce((acc, key) => {
				const column = [
					...searchedAttributeKeys,
					...optionsQueryData.selectColumns,
				].find(({ id }) => id === key);

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
			searchedAttributeKeys,
			selectedColumnKeys,
			optionsQueryData,
			handleRedirectWithOptionsData,
		],
	);

	const handleRemoveSelectedColumn = useCallback(
		(columnKey: string) => {
			const newSelectedColumns = optionsQueryData?.selectColumns?.filter(
				({ id }) => id !== columnKey,
			);

			if (!newSelectedColumns.length && dataSource !== DataSource.LOGS) {
				notifications.error({
					message: 'There must be at least one selected column',
				});
			} else {
				const optionsData: OptionsQuery = {
					...optionsQueryData,
					selectColumns: newSelectedColumns,
				};

				handleRedirectWithOptionsData(optionsData);
			}
		},
		[dataSource, notifications, optionsQueryData, handleRedirectWithOptionsData],
	);

	const handleFormatChange = useCallback(
		(value: LogViewMode) => {
			const optionsData: OptionsQuery = {
				...optionsQueryData,
				format: value,
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
	const handleFontSizeChange = useCallback(
		(value: FontSize) => {
			const optionsData: OptionsQuery = {
				...optionsQueryData,
				fontSize: value,
			};

			handleRedirectWithOptionsData(optionsData);
		},
		[handleRedirectWithOptionsData, optionsQueryData],
	);

	const handleSearchAttribute = useCallback((value: string) => {
		setSearchText(value);
	}, []);

	const handleFocus = (): void => {
		setIsFocused(true);
	};

	const handleBlur = (): void => {
		setIsFocused(false);
		setSearchText('');
	};

	const optionsMenuConfig: Required<OptionsMenuConfig> = useMemo(
		() => ({
			addColumn: {
				isFetching: isSearchedAttributesFetching,
				value: optionsQueryData?.selectColumns || defaultOptionsQuery.selectColumns,
				options: optionsFromAttributeKeys || [],
				onFocus: handleFocus,
				onBlur: handleBlur,
				onSelect: handleSelectColumns,
				onRemove: handleRemoveSelectedColumn,
				onSearch: handleSearchAttribute,
			},
			format: {
				value: optionsQueryData.format || defaultOptionsQuery.format,
				onChange: handleFormatChange,
			},
			maxLines: {
				value: optionsQueryData.maxLines || defaultOptionsQuery.maxLines,
				onChange: handleMaxLinesChange,
			},
			fontSize: {
				value: optionsQueryData?.fontSize || defaultOptionsQuery.fontSize,
				onChange: handleFontSizeChange,
			},
		}),
		[
			isSearchedAttributesFetching,
			optionsQueryData?.selectColumns,
			optionsQueryData.format,
			optionsQueryData.maxLines,
			optionsQueryData?.fontSize,
			optionsFromAttributeKeys,
			handleSelectColumns,
			handleRemoveSelectedColumn,
			handleSearchAttribute,
			handleFormatChange,
			handleMaxLinesChange,
			handleFontSizeChange,
		],
	);

	useEffect(() => {
		if (optionsQuery || !isFetchedInitialAttributes) return;

		const nextOptionsQuery = localStorageOptionsQuery
			? JSON.parse(localStorageOptionsQuery)
			: initialOptionsQuery;

		redirectWithOptionsData(nextOptionsQuery);
	}, [
		isFetchedInitialAttributes,
		optionsQuery,
		initialOptionsQuery,
		localStorageOptionsQuery,
		redirectWithOptionsData,
	]);

	return {
		options: optionsQueryData,
		config: optionsMenuConfig,
		handleOptionsChange: handleRedirectWithOptionsData,
	};
};

export default useOptionsMenu;
