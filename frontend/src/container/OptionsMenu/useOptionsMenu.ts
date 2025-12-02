/* eslint-disable sonarjs/cognitive-complexity */
import { getKeySuggestions } from 'api/querySuggestions/getKeySuggestions';
import { TelemetryFieldKey } from 'api/v5/v5';
import { AxiosResponse } from 'axios';
import { LogViewMode } from 'container/LogsTable';
import { useGetQueryKeySuggestions } from 'hooks/querySuggestions/useGetQueryKeySuggestions';
import useDebounce from 'hooks/useDebounce';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { has } from 'lodash-es';
import { AllTraceFilterKeyValue } from 'pages/TracesExplorer/Filter/filterUtils';
import { usePreferenceContext } from 'providers/preferences/context/PreferenceContextProvider';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueries } from 'react-query';
import {
	QueryKeyRequestProps,
	QueryKeySuggestionsResponseProps,
} from 'types/api/querySuggestions/types';
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
import {
	createTelemetryFieldKey,
	getOptionsFromKeys,
	resolveColumnConflicts,
} from './utils';

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
	// aggregateOperator,
	initialOptions = {},
}: UseOptionsMenuProps): UseOptionsMenu => {
	const { notifications } = useNotifications();
	const prefCtx = usePreferenceContext();
	// TODO: send null to updateColumns and updateFormatting if dataSource is not logs or traces
	const slice = dataSource === DataSource.TRACES ? prefCtx.traces : prefCtx.logs;
	const { preferences, updateColumns, updateFormatting } = slice;

	const [searchText, setSearchText] = useState<string>('');
	const [isFocused, setIsFocused] = useState<boolean>(false);
	const debouncedSearchText = useDebounce(searchText, 300);

	const initialQueryParamsV5: QueryKeyRequestProps = useMemo(
		() => ({
			signal: dataSource,
			searchText: '',
		}),
		[dataSource],
	);

	const {
		query: optionsQuery,
		redirectWithQuery: redirectWithOptionsData,
	} = useUrlQueryData<OptionsQuery>(URL_OPTIONS, defaultOptionsQuery);

	const initialQueriesV5 = useMemo(
		() =>
			initialOptions?.selectColumns?.map((column) => ({
				queryKey: column,
				queryFn: (): Promise<AxiosResponse<QueryKeySuggestionsResponseProps>> =>
					getKeySuggestions({
						...initialQueryParamsV5,
						searchText: column,
					}),
				enabled: !!column && !optionsQuery,
			})) || [],
		[initialOptions?.selectColumns, initialQueryParamsV5, optionsQuery],
	);

	const initialAttributesResult = useQueries(initialQueriesV5);

	const isFetchedInitialAttributes = useMemo(
		() => initialAttributesResult.every((result) => result.isFetched),
		[initialAttributesResult],
	);

	const initialSelectedColumns = useMemo(() => {
		if (!isFetchedInitialAttributes) {
			return [];
		}

		// Collect all suggestions from all API responses first
		const allSuggestions =
			initialAttributesResult?.flatMap((attributeResponse) =>
				Object.values(attributeResponse?.data?.data?.data?.keys || {})
					.flat()
					.map((suggestion) => createTelemetryFieldKey(suggestion)),
			) || [];

		// Resolve conflicts and deduplicate once at the end for better performance
		const attributesData = resolveColumnConflicts(allSuggestions);

		let initialSelected: TelemetryFieldKey[] = (initialOptions?.selectColumns
			?.map((column) => attributesData.find(({ key }) => key === column))
			.filter((e) => !!e) || []) as TelemetryFieldKey[];

		if (dataSource === DataSource.TRACES) {
			initialSelected = initialSelected
				?.map((col) => {
					if (col && Object.keys(AllTraceFilterKeyValue).includes(col?.name)) {
						const metaData = defaultTraceSelectedColumns.find(
							(coln) => coln.key === col.key,
						);

						if (metaData) {
							return {
								...metaData,
								name: metaData.name,
							};
						}
					}
					return col;
				})
				.filter((e) => !!e);

			if (!initialSelected || !initialSelected?.length) {
				initialSelected = defaultTraceSelectedColumns.map((e) => ({
					...e,
					name: e.name,
				}));
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
		data: searchedAttributesDataV5,
		isFetching: isSearchedAttributesFetchingV5,
	} = useGetQueryKeySuggestions(
		{
			...initialQueryParamsV5,
			searchText: debouncedSearchText,
		},
		{ queryKey: [debouncedSearchText, isFocused], enabled: isFocused },
	);

	// const {
	// 	data: searchedAttributesData,
	// 	isFetching: isSearchedAttributesFetching,
	// } = useGetAggregateKeys(
	// 	{
	// 		...initialQueryParams,
	// 		searchText: debouncedSearchText,
	// 	},
	// 	{ queryKey: [debouncedSearchText, isFocused], enabled: isFocused },
	// );

	const searchedAttributeKeys: TelemetryFieldKey[] = useMemo(() => {
		const searchedAttributesDataList = Object.values(
			searchedAttributesDataV5?.data.data.keys || {},
		).flat();

		if (searchedAttributesDataList.length) {
			// Map all attributes with proper key and displayName
			const mappedAttributes = searchedAttributesDataList.map((e) =>
				createTelemetryFieldKey(e),
			);

			// Combine with default columns and resolve conflicts
			const allColumns =
				dataSource === DataSource.LOGS
					? [...defaultLogsSelectedColumns, ...mappedAttributes]
					: mappedAttributes;

			// Resolve conflicts with deduplication
			return resolveColumnConflicts(allColumns);
		}

		if (dataSource === DataSource.TRACES) {
			return defaultTraceSelectedColumns.map((e) => ({
				...e,
				name: e.name,
			}));
		}

		return [];
	}, [dataSource, searchedAttributesDataV5?.data.data.keys]);

	const initialOptionsQuery: OptionsQuery = useMemo(() => {
		let defaultColumns: TelemetryFieldKey[] = defaultOptionsQuery.selectColumns;
		if (dataSource === DataSource.TRACES) {
			defaultColumns = defaultTraceSelectedColumns;
		} else if (dataSource === DataSource.LOGS) {
			// eslint-disable-next-line sonarjs/no-identical-functions
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
		() => preferences?.columns?.map(({ key }) => key) || [],
		[preferences?.columns],
	);

	const optionsFromAttributeKeys = useMemo(() => {
		const filteredAttributeKeys = searchedAttributeKeys.filter((item) => {
			if (dataSource !== DataSource.LOGS) {
				return item.name !== 'body';
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
				].find((column) => column.key === key);

				if (!column) return acc;
				return [...acc, column];
			}, [] as TelemetryFieldKey[]);

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
				(column) => column.key !== columnKey,
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
				isFetching: isSearchedAttributesFetchingV5,
				value:
					preferences?.columns.filter((item) => has(item, 'name')) ||
					defaultOptionsQuery.selectColumns.filter((item) => has(item, 'name')),
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
			isSearchedAttributesFetchingV5,
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
