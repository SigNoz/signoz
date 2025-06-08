import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { LogViewMode } from 'container/LogsTable';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import useDebounce from 'hooks/useDebounce';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQueryData from 'hooks/useUrlQueryData';
import {
	AllTraceFilterKeys,
	AllTraceFilterKeyValue,
} from 'pages/TracesExplorer/Filter/filterUtils';
import { usePreferenceContext } from 'providers/preferences/context/PreferenceContextProvider';
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
	storageKey?: string;
	dataSource: DataSource;
	aggregateOperator: string;
	initialOptions?: InitialOptions;
}

interface UseOptionsMenu {
	options: OptionsQuery;
	config: OptionsMenuConfig;
	handleOptionsChange: (newQueryData: OptionsQuery) => void;
}

const useOptionsMenu = ({
	dataSource,
	aggregateOperator,
	initialOptions = {},
}: UseOptionsMenuProps): UseOptionsMenu => {
	const { notifications } = useNotifications();
	const {
		preferences,
		updateColumns,
		updateFormatting,
	} = usePreferenceContext();

	const [searchText, setSearchText] = useState<string>('');
	const [isFocused, setIsFocused] = useState<boolean>(false);
	const debouncedSearchText = useDebounce(searchText, 300);

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
		if (!isFetchedInitialAttributes) {
			return [];
		}

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

			if (!initialSelected || !initialSelected?.length) {
				initialSelected = defaultTraceSelectedColumns;
			}
		}

		return initialSelected || [];
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

	const initialOptionsQuery: OptionsQuery = useMemo(() => {
		let defaultColumns = defaultOptionsQuery.selectColumns;
		if (dataSource === DataSource.TRACES) {
			defaultColumns = defaultTraceSelectedColumns;
		} else if (dataSource === DataSource.LOGS) {
			defaultColumns = defaultLogsSelectedColumns;
		}

		const finalSelectColumns = initialOptions?.selectColumns
			? initialSelectedColumns
			: defaultColumns;

		return {
			...defaultOptionsQuery,
			...initialOptions,
			selectColumns: finalSelectColumns,
		};
	}, [dataSource, initialOptions, initialSelectedColumns]);

	const selectedColumnKeys = useMemo(
		() => preferences?.columns?.map(({ id }) => id) || [],
		[preferences?.columns],
	);

	const optionsFromAttributeKeys = useMemo(() => {
		const filteredAttributeKeys = searchedAttributeKeys.filter((item) => {
			if (dataSource !== DataSource.LOGS) {
				return item.key !== 'body';
			}
			return true;
		});

		return getOptionsFromKeys(filteredAttributeKeys, selectedColumnKeys);
	}, [dataSource, searchedAttributeKeys, selectedColumnKeys]);

	const handleRedirectWithOptionsData = useCallback(
		(newQueryData: OptionsQuery) => {
			redirectWithOptionsData(newQueryData);
		},
		[redirectWithOptionsData],
	);

	const handleSelectColumns = useCallback(
		(value: string) => {
			const newSelectedColumnKeys = [...new Set([...selectedColumnKeys, value])];
			const newSelectedColumns = newSelectedColumnKeys.reduce((acc, key) => {
				const column = [
					...searchedAttributeKeys,
					...(preferences?.columns || []),
				].find(({ id }) => id === key);

				if (!column) return acc;
				return [...acc, column];
			}, [] as BaseAutocompleteData[]);

			const optionsData: OptionsQuery = {
				...defaultOptionsQuery,
				selectColumns: newSelectedColumns,
				format: preferences?.formatting?.format || defaultOptionsQuery.format,
				maxLines: preferences?.formatting?.maxLines || defaultOptionsQuery.maxLines,
				fontSize: preferences?.formatting?.fontSize || defaultOptionsQuery.fontSize,
			};

			updateColumns(newSelectedColumns);
			handleRedirectWithOptionsData(optionsData);
		},
		[
			searchedAttributeKeys,
			selectedColumnKeys,
			preferences,
			handleRedirectWithOptionsData,
			updateColumns,
		],
	);

	const handleRemoveSelectedColumn = useCallback(
		(columnKey: string) => {
			const newSelectedColumns = preferences?.columns?.filter(
				({ id }) => id !== columnKey,
			);

			if (!newSelectedColumns?.length && dataSource !== DataSource.LOGS) {
				notifications.error({
					message: 'There must be at least one selected column',
				});
			} else {
				const optionsData: OptionsQuery = {
					...defaultOptionsQuery,
					selectColumns: newSelectedColumns || [],
					format: preferences?.formatting?.format || defaultOptionsQuery.format,
					maxLines:
						preferences?.formatting?.maxLines || defaultOptionsQuery.maxLines,
					fontSize:
						preferences?.formatting?.fontSize || defaultOptionsQuery.fontSize,
				};
				updateColumns(newSelectedColumns || []);
				handleRedirectWithOptionsData(optionsData);
			}
		},
		[
			dataSource,
			notifications,
			preferences,
			handleRedirectWithOptionsData,
			updateColumns,
		],
	);

	const handleFormatChange = useCallback(
		(value: LogViewMode) => {
			const optionsData: OptionsQuery = {
				...defaultOptionsQuery,
				selectColumns: preferences?.columns || [],
				format: value,
				maxLines: preferences?.formatting?.maxLines || defaultOptionsQuery.maxLines,
				fontSize: preferences?.formatting?.fontSize || defaultOptionsQuery.fontSize,
			};

			updateFormatting({
				maxLines: preferences?.formatting?.maxLines || defaultOptionsQuery.maxLines,
				format: value,
				fontSize: preferences?.formatting?.fontSize || defaultOptionsQuery.fontSize,
			});
			handleRedirectWithOptionsData(optionsData);
		},
		[handleRedirectWithOptionsData, preferences, updateFormatting],
	);

	const handleMaxLinesChange = useCallback(
		(value: string | number | null) => {
			const optionsData: OptionsQuery = {
				...defaultOptionsQuery,
				selectColumns: preferences?.columns || [],
				format: preferences?.formatting?.format || defaultOptionsQuery.format,
				maxLines: value as number,
				fontSize: preferences?.formatting?.fontSize || defaultOptionsQuery.fontSize,
			};

			updateFormatting({
				maxLines: value as number,
				format: preferences?.formatting?.format || defaultOptionsQuery.format,
				fontSize: preferences?.formatting?.fontSize || defaultOptionsQuery.fontSize,
			});
			handleRedirectWithOptionsData(optionsData);
		},
		[handleRedirectWithOptionsData, preferences, updateFormatting],
	);

	const handleFontSizeChange = useCallback(
		(value: FontSize) => {
			const optionsData: OptionsQuery = {
				...defaultOptionsQuery,
				selectColumns: preferences?.columns || [],
				format: preferences?.formatting?.format || defaultOptionsQuery.format,
				maxLines: preferences?.formatting?.maxLines || defaultOptionsQuery.maxLines,
				fontSize: value,
			};

			updateFormatting({
				maxLines: preferences?.formatting?.maxLines || defaultOptionsQuery.maxLines,
				format: preferences?.formatting?.format || defaultOptionsQuery.format,
				fontSize: value,
			});
			handleRedirectWithOptionsData(optionsData);
		},
		[handleRedirectWithOptionsData, preferences, updateFormatting],
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
				value: preferences?.columns || defaultOptionsQuery.selectColumns,
				options: optionsFromAttributeKeys || [],
				onFocus: handleFocus,
				onBlur: handleBlur,
				onSelect: handleSelectColumns,
				onRemove: handleRemoveSelectedColumn,
				onSearch: handleSearchAttribute,
			},
			format: {
				value: preferences?.formatting?.format || defaultOptionsQuery.format,
				onChange: handleFormatChange,
			},
			maxLines: {
				value: preferences?.formatting?.maxLines || defaultOptionsQuery.maxLines,
				onChange: handleMaxLinesChange,
			},
			fontSize: {
				value: preferences?.formatting?.fontSize || defaultOptionsQuery.fontSize,
				onChange: handleFontSizeChange,
			},
		}),
		[
			isSearchedAttributesFetching,
			preferences,
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
		if (optionsQuery || !isFetchedInitialAttributes) {
			return;
		}

		redirectWithOptionsData(initialOptionsQuery);
	}, [
		isFetchedInitialAttributes,
		optionsQuery,
		initialOptionsQuery,
		redirectWithOptionsData,
	]);

	return {
		options: {
			selectColumns: preferences?.columns || [],
			format: preferences?.formatting?.format || defaultOptionsQuery.format,
			maxLines: preferences?.formatting?.maxLines || defaultOptionsQuery.maxLines,
			fontSize: preferences?.formatting?.fontSize || defaultOptionsQuery.fontSize,
		},
		config: optionsMenuConfig,
		handleOptionsChange: handleRedirectWithOptionsData,
	};
};

export default useOptionsMenu;
