import { isQueryUpdatedInView } from 'components/ExplorerCard/utils';
import { QueryParams } from 'constants/query';
import {
	alphabet,
	baseAutoCompleteIdKeysOrder,
	formulasNames,
	initialClickHouseData,
	initialFormulaBuilderFormValues,
	initialQueriesMap,
	initialQueryBuilderFormTraceOperatorValues,
	initialQueryBuilderFormValuesMap,
	initialQueryPromQLData,
	initialQueryState,
	initialSingleQueryMap,
	MAX_FORMULAS,
	MAX_QUERIES,
	PANEL_TYPES,
	TRACE_OPERATOR_QUERY_NAME,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import {
	panelTypeDataSourceFormValuesMap,
	PartialPanelTypes,
} from 'container/NewWidget/utils';
import { OptionsQuery } from 'container/OptionsMenu/types';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { updateStepInterval } from 'hooks/queryBuilder/useStepInterval';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { createIdFromObjectFields } from 'lib/createIdFromObjectFields';
import { createNewBuilderItemName } from 'lib/newQueryBuilder/createNewBuilderItemName';
import { getOperatorsBySourceAndPanelType } from 'lib/newQueryBuilder/getOperatorsBySourceAndPanelType';
import { replaceIncorrectObjectFields } from 'lib/replaceIncorrectObjectFields';
import { cloneDeep, get, isEqual, set } from 'lodash-es';
import {
	createContext,
	PropsWithChildren,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
// ** Types
import {
	IBuilderFormula,
	IBuilderQuery,
	IBuilderTraceOperator,
	IClickHouseQuery,
	IPromQLQuery,
	Query,
	QueryState,
} from 'types/api/queryBuilder/queryBuilderData';
import { ViewProps } from 'types/api/saveViews/types';
import { EQueryType } from 'types/common/dashboard';
import {
	DataSource,
	IsDefaultQueryProps,
	QueryBuilderContextType,
	QueryBuilderData,
} from 'types/common/queryBuilder';
import { sanitizeOrderByForExplorer } from 'utils/sanitizeOrderBy';
import { v4 as uuid } from 'uuid';

export const QueryBuilderContext = createContext<QueryBuilderContextType>({
	currentQuery: initialQueriesMap.metrics,
	supersetQuery: initialQueriesMap.metrics,
	lastUsedQuery: null,
	setLastUsedQuery: () => {},
	setSupersetQuery: () => {},
	stagedQuery: initialQueriesMap.metrics,
	initialDataSource: null,
	panelType: PANEL_TYPES.TIME_SERIES,
	isEnabledQuery: false,
	handleSetQueryData: () => {},
	handleSetTraceOperatorData: () => {},
	handleSetFormulaData: () => {},
	handleSetQueryItemData: () => {},
	handleSetConfig: () => {},
	removeQueryBuilderEntityByIndex: () => {},
	removeAllQueryBuilderEntities: () => {},
	removeQueryTypeItemByIndex: () => {},
	addNewBuilderQuery: () => {},
	cloneQuery: () => {},
	addNewFormula: () => {},
	addTraceOperator: () => {},
	removeTraceOperator: () => {},
	addNewQueryItem: () => {},
	redirectWithQueryBuilderData: () => {},
	handleRunQuery: () => {},
	resetQuery: () => {},
	updateAllQueriesOperators: () => initialQueriesMap.metrics,
	updateQueriesData: () => initialQueriesMap.metrics,
	initQueryBuilderData: () => {},
	handleOnUnitsChange: () => {},
	isStagedQueryUpdated: () => false,
	isDefaultQuery: () => false,
});

export function QueryBuilderProvider({
	children,
}: PropsWithChildren): JSX.Element {
	const urlQuery = useUrlQuery();
	const location = useLocation();

	const currentPathnameRef = useRef<string | null>(location.pathname);

	// This is used to determine if the query was called from the handleRunQuery function - which means manual trigger from Stage and Run button
	const [
		calledFromHandleRunQuery,
		setCalledFromHandleRunQuery,
	] = useState<boolean>(false);

	const compositeQueryParam = useGetCompositeQueryParam();
	const { queryType: queryTypeParam, ...queryState } =
		compositeQueryParam || initialQueriesMap.metrics;

	const [initialDataSource, setInitialDataSource] = useState<DataSource | null>(
		null,
	);

	const panelTypeQueryParams = urlQuery.get(
		QueryParams.panelTypes,
	) as PANEL_TYPES | null;

	const [panelType, setPanelType] = useState<PANEL_TYPES | null>(
		panelTypeQueryParams,
	);

	const [currentQuery, setCurrentQuery] = useState<QueryState>(queryState);
	const [supersetQuery, setSupersetQuery] = useState<QueryState>(queryState);
	const [lastUsedQuery, setLastUsedQuery] = useState<number | null>(0);
	const [stagedQuery, setStagedQuery] = useState<Query | null>(null);

	const [queryType, setQueryType] = useState<EQueryType>(queryTypeParam);

	const getElementWithActualOperator = useCallback(
		(
			queryData: IBuilderQuery,
			dataSource: DataSource,
			currentPanelType: PANEL_TYPES,
		): IBuilderQuery => {
			const initialOperators = getOperatorsBySourceAndPanelType({
				dataSource,
				panelType: currentPanelType,
			});

			const isCurrentOperatorAvailableInList = initialOperators
				.map((operator) => operator.value)
				.includes(queryData.aggregateOperator || '');

			if (!isCurrentOperatorAvailableInList) {
				return { ...queryData, aggregateOperator: initialOperators[0]?.value };
			}

			return queryData;
		},
		[],
	);

	const prepareQueryBuilderData = useCallback(
		(query: Query): Query => {
			const builder: QueryBuilderData = {
				queryData: query.builder.queryData?.map((item) => ({
					...initialQueryBuilderFormValuesMap[
						initialDataSource || DataSource.METRICS
					],
					...item,
				})),
				queryFormulas: query.builder.queryFormulas?.map((item) => ({
					...initialFormulaBuilderFormValues,
					...item,
				})),
				queryTraceOperator: query.builder.queryTraceOperator?.map((item) => ({
					...initialQueryBuilderFormTraceOperatorValues,
					...item,
				})),
			};

			const setupedQueryData = builder.queryData.map((item) => {
				const currentElement: IBuilderQuery = {
					...item,
					groupBy: item.groupBy.map(({ id: _, ...item }) => ({
						...item,
						id: createIdFromObjectFields(item, baseAutoCompleteIdKeysOrder),
					})),
					aggregateAttribute: {
						...item.aggregateAttribute,
						id: createIdFromObjectFields(
							item.aggregateAttribute as BaseAutocompleteData,
							baseAutoCompleteIdKeysOrder,
						),
					} as BaseAutocompleteData,
				};

				// Explorer pages: sanitize stale orderBy before first query
				const isExplorer =
					location.pathname === ROUTES.LOGS_EXPLORER ||
					location.pathname === ROUTES.TRACES_EXPLORER;
				if (isExplorer) {
					const sanitizedOrderBy = sanitizeOrderByForExplorer(currentElement);
					return calledFromHandleRunQuery
						? currentElement
						: { ...currentElement, orderBy: sanitizedOrderBy };
				}

				return currentElement;
			});

			const promql: IPromQLQuery[] = query.promql.map((item) => ({
				...initialQueryPromQLData,
				...item,
			}));

			const clickHouse: IClickHouseQuery[] = query.clickhouse_sql.map((item) => ({
				...initialClickHouseData,
				...item,
			}));

			const newQueryState: QueryState = {
				clickhouse_sql: clickHouse,
				promql,
				builder: {
					...builder,
					queryData: setupedQueryData,
				},
				id: query.id,
				unit: query.unit,
			};

			const nextQuery: Query = {
				...newQueryState,
				queryType: query.queryType,
			};

			return nextQuery;
		},
		[initialDataSource, location.pathname, calledFromHandleRunQuery],
	);

	const initQueryBuilderData = useCallback(
		(query: Query): void => {
			const { queryType: newQueryType, ...queryState } = prepareQueryBuilderData(
				query,
			);

			const type = newQueryType || EQueryType.QUERY_BUILDER;

			const newQueryState: QueryState = {
				...queryState,
				id: queryState.id,
			};

			const nextQuery: Query = { ...newQueryState, queryType: type };

			setStagedQuery(nextQuery);
			setCurrentQuery(newQueryState);
			setQueryType(type);
		},
		[prepareQueryBuilderData],
	);

	const updateAllQueriesOperators = useCallback(
		(
			query: Query,
			panelType: PANEL_TYPES,
			dataSource: DataSource,
			signalSource?: 'meter' | '',
		): Query => {
			const queryData = query.builder.queryData?.map((item) =>
				getElementWithActualOperator(item, dataSource, panelType),
			);

			return {
				...query,
				builder: {
					...query.builder,
					queryData: queryData.map((item) => ({
						...item,
						source: signalSource,
					})),
				},
			};
		},

		[getElementWithActualOperator],
	);

	const extractRelevantKeys = useCallback(
		(queryData: IBuilderQuery): IBuilderQuery => {
			const {
				dataSource,
				queryName,
				aggregateOperator,
				aggregateAttribute,
				timeAggregation,
				spaceAggregation,
				functions,
				filters,
				expression,
				disabled,
				stepInterval,
				having,
				groupBy,
				legend,
			} = queryData;

			return {
				dataSource,
				queryName,
				aggregateOperator,
				// remove id from aggregateAttribute
				aggregateAttribute: {
					...aggregateAttribute,
					id: '',
				} as BaseAutocompleteData,
				timeAggregation,
				spaceAggregation,
				functions,
				filters,
				expression,
				disabled,
				stepInterval,
				having,
				groupBy,
				legend,
				// set to default values
				orderBy: [],
				limit: null,
				reduceTo: 'avg',
			};
		},
		[],
	);

	const isDefaultQuery = useCallback(
		({ currentQuery, sourcePage }: IsDefaultQueryProps): boolean => {
			// Get default query with updated operators
			const defaultQuery = updateAllQueriesOperators(
				initialQueriesMap[sourcePage],
				PANEL_TYPES.LIST,
				sourcePage,
			);

			// Early return if query types don't match
			if (currentQuery.queryType !== defaultQuery.queryType) {
				return false;
			}

			// Only compare builder queries
			if (currentQuery.queryType !== EQueryType.QUERY_BUILDER) {
				return false;
			}

			// If there is more than one query, then it is not a default query
			if (currentQuery.builder.queryData.length > 1) {
				return false;
			}

			const currentBuilderData = extractRelevantKeys(
				currentQuery.builder.queryData[0],
			);
			const defaultBuilderData = extractRelevantKeys(
				defaultQuery.builder.queryData[0],
			);

			return isEqual(currentBuilderData, defaultBuilderData);
		},
		[updateAllQueriesOperators, extractRelevantKeys],
	);
	const updateQueriesData = useCallback(
		<T extends keyof QueryBuilderData>(
			query: Query,
			type: T,
			updateCallback: (
				item: QueryBuilderData[T][number],
				index: number,
			) => QueryBuilderData[T][number],
		): Query => {
			const result = query.builder[type].map(updateCallback);

			return { ...query, builder: { ...query.builder, [type]: result } };
		},
		[],
	);

	const removeQueryBuilderEntityByIndex = useCallback(
		(type: keyof QueryBuilderData, index: number) => {
			setCurrentQuery((prevState) => {
				const currentArray: (
					| IBuilderQuery
					| IBuilderFormula
					| IBuilderTraceOperator
				)[] = prevState.builder[type];

				const filteredArray = currentArray.filter((_, i) => index !== i);

				return {
					...prevState,
					builder: {
						...prevState.builder,
						[type]: filteredArray,
					},
				};
			});
			// eslint-disable-next-line sonarjs/no-identical-functions
			setSupersetQuery((prevState) => {
				const currentArray: (
					| IBuilderQuery
					| IBuilderFormula
					| IBuilderTraceOperator
				)[] = prevState.builder[type];

				const filteredArray = currentArray.filter((_, i) => index !== i);

				return {
					...prevState,
					builder: {
						...prevState.builder,
						[type]: filteredArray,
					},
				};
			});
		},
		[],
	);

	const removeAllQueryBuilderEntities = useCallback(
		(type: keyof QueryBuilderData) => {
			setCurrentQuery((prevState) => ({
				...prevState,
				builder: { ...prevState.builder, [type]: [] },
			}));
			setSupersetQuery((prevState) => ({
				...prevState,
				builder: { ...prevState.builder, [type]: [] },
			}));
		},
		[setCurrentQuery, setSupersetQuery],
	);

	const removeQueryTypeItemByIndex = useCallback(
		(type: EQueryType.PROM | EQueryType.CLICKHOUSE, index: number) => {
			setCurrentQuery((prevState) => {
				const targetArray: (IPromQLQuery | IClickHouseQuery)[] = prevState[type];
				return {
					...prevState,
					[type]: targetArray.filter((_, i) => index !== i),
				};
			});
			// eslint-disable-next-line sonarjs/no-identical-functions
			setSupersetQuery((prevState) => {
				const targetArray: (IPromQLQuery | IClickHouseQuery)[] = prevState[type];
				return {
					...prevState,
					[type]: targetArray.filter((_, i) => index !== i),
				};
			});
		},
		[],
	);

	const createNewBuilderQuery = useCallback(
		(queries: IBuilderQuery[]): IBuilderQuery => {
			const existNames = queries.map((item) => item.queryName);
			const initialBuilderQuery =
				initialQueryBuilderFormValuesMap[initialDataSource || DataSource.METRICS];

			const newQuery: IBuilderQuery = {
				...initialBuilderQuery,
				source: queries?.[0]?.source || '',
				queryName: createNewBuilderItemName({ existNames, sourceNames: alphabet }),
				expression: createNewBuilderItemName({
					existNames,
					sourceNames: alphabet,
				}),
			};

			return newQuery;
		},
		[initialDataSource],
	);

	const cloneNewBuilderQuery = useCallback(
		(queries: IBuilderQuery[], query: IBuilderQuery): IBuilderQuery => {
			const existNames = queries.map((item) => item.queryName);
			const clonedQuery: IBuilderQuery = {
				...query,
				queryName: createNewBuilderItemName({ existNames, sourceNames: alphabet }),
				expression: createNewBuilderItemName({
					existNames,
					sourceNames: alphabet,
				}),
			};

			return clonedQuery;
		},
		[],
	);

	const createNewBuilderFormula = useCallback((formulas: IBuilderFormula[]) => {
		const existNames = formulas.map((item) => item.queryName);

		const newFormula: IBuilderFormula = {
			...initialFormulaBuilderFormValues,
			queryName: createNewBuilderItemName({
				existNames,
				sourceNames: formulasNames,
			}),
		};

		return newFormula;
	}, []);

	const createNewQueryTypeItem = useCallback(
		(
			itemArray: QueryState['clickhouse_sql'] | QueryState['promql'],
			type: EQueryType.CLICKHOUSE | EQueryType.PROM,
		): IPromQLQuery | IClickHouseQuery => {
			const existNames = itemArray.map((item) => item.name);

			const newItem: IPromQLQuery | IClickHouseQuery = {
				...initialSingleQueryMap[type],
				name: createNewBuilderItemName({
					existNames,
					sourceNames: alphabet,
				}),
			};

			return newItem;
		},
		[],
	);

	const addNewQueryItem = useCallback(
		(type: EQueryType.CLICKHOUSE | EQueryType.PROM) => {
			setCurrentQuery((prevState) => {
				if (prevState[type].length >= MAX_QUERIES) return prevState;

				const newQuery = createNewQueryTypeItem(prevState[type], type);

				return {
					...prevState,
					[type]: [...prevState[type], newQuery],
				};
			});
			// eslint-disable-next-line sonarjs/no-identical-functions
			setSupersetQuery((prevState) => {
				if (prevState[type].length >= MAX_QUERIES) return prevState;

				const newQuery = createNewQueryTypeItem(prevState[type], type);

				return {
					...prevState,
					[type]: [...prevState[type], newQuery],
				};
			});
		},
		[createNewQueryTypeItem],
	);

	const addNewBuilderQuery = useCallback(() => {
		setCurrentQuery((prevState) => {
			if (prevState.builder.queryData.length >= MAX_QUERIES) return prevState;

			console.log('prevState', prevState.builder.queryData);

			const newQuery = createNewBuilderQuery(prevState.builder.queryData);

			return {
				...prevState,
				builder: {
					...prevState.builder,
					queryData: [...prevState.builder.queryData, newQuery],
				},
			};
		});

		// eslint-disable-next-line sonarjs/no-identical-functions
		setSupersetQuery((prevState) => {
			if (prevState.builder.queryData.length >= MAX_QUERIES) return prevState;

			const newQuery = createNewBuilderQuery(prevState.builder.queryData);

			return {
				...prevState,
				builder: {
					...prevState.builder,
					queryData: [...prevState.builder.queryData, newQuery],
				},
			};
		});
	}, [createNewBuilderQuery]);

	const cloneQuery = useCallback(
		(type: string, query: IBuilderQuery): void => {
			setCurrentQuery((prevState) => {
				if (prevState.builder.queryData.length >= MAX_QUERIES) return prevState;

				const clonedQuery = cloneNewBuilderQuery(
					prevState.builder.queryData,
					query,
				);

				return {
					...prevState,
					builder: {
						...prevState.builder,
						queryData: [...prevState.builder.queryData, clonedQuery],
					},
				};
			});
			// eslint-disable-next-line sonarjs/no-identical-functions
			setSupersetQuery((prevState) => {
				if (prevState.builder.queryData.length >= MAX_QUERIES) return prevState;

				const clonedQuery = cloneNewBuilderQuery(
					prevState.builder.queryData,
					query,
				);

				return {
					...prevState,
					builder: {
						...prevState.builder,
						queryData: [...prevState.builder.queryData, clonedQuery],
					},
				};
			});
		},
		[cloneNewBuilderQuery],
	);

	const addNewFormula = useCallback(() => {
		setCurrentQuery((prevState) => {
			if (prevState.builder.queryFormulas.length >= MAX_FORMULAS) return prevState;

			const newFormula = createNewBuilderFormula(prevState.builder.queryFormulas);

			return {
				...prevState,
				builder: {
					...prevState.builder,
					queryFormulas: [...prevState.builder.queryFormulas, newFormula],
				},
			};
		});
		// eslint-disable-next-line sonarjs/no-identical-functions
		setSupersetQuery((prevState) => {
			if (prevState.builder.queryFormulas.length >= MAX_FORMULAS) return prevState;

			const newFormula = createNewBuilderFormula(prevState.builder.queryFormulas);

			return {
				...prevState,
				builder: {
					...prevState.builder,
					queryFormulas: [...prevState.builder.queryFormulas, newFormula],
				},
			};
		});
	}, [createNewBuilderFormula]);

	const addTraceOperator = useCallback((expression = '') => {
		const trimmed = (expression || '').trim();

		setCurrentQuery((prevState) => {
			const existing = prevState.builder.queryTraceOperator?.[0] || null;
			const updated: IBuilderTraceOperator = existing
				? { ...existing, expression: trimmed }
				: {
						...initialQueryBuilderFormTraceOperatorValues,
						queryName: TRACE_OPERATOR_QUERY_NAME,
						expression: trimmed,
				  };

			return {
				...prevState,
				builder: {
					...prevState.builder,
					// enforce single trace operator and replace only expression
					queryTraceOperator: [updated],
				},
			};
		});
		// eslint-disable-next-line sonarjs/no-identical-functions
		setSupersetQuery((prevState) => {
			const existing = prevState.builder.queryTraceOperator?.[0] || null;
			const updated: IBuilderTraceOperator = existing
				? { ...existing, expression: trimmed }
				: {
						...initialQueryBuilderFormTraceOperatorValues,
						queryName: TRACE_OPERATOR_QUERY_NAME,
						expression: trimmed,
				  };

			return {
				...prevState,
				builder: {
					...prevState.builder,
					// enforce single trace operator and replace only expression
					queryTraceOperator: [updated],
				},
			};
		});
	}, []);

	const removeTraceOperator = useCallback(() => {
		setCurrentQuery((prevState) => ({
			...prevState,
			builder: {
				...prevState.builder,
				queryTraceOperator: [],
			},
		}));
		// eslint-disable-next-line sonarjs/no-identical-functions
		setSupersetQuery((prevState) => ({
			...prevState,
			builder: {
				...prevState.builder,
				queryTraceOperator: [],
			},
		}));
	}, []);

	const updateQueryBuilderData: <T>(
		arr: T[],
		index: number,
		newQueryItem: T,
	) => T[] = useCallback(
		(arr, index, newQueryItem) =>
			arr.map((item, idx) => (index === idx ? newQueryItem : item)),
		[],
	);

	const updateSuperSetQueryBuilderData = useCallback(
		(arr: IBuilderQuery[], index: number, newQueryItem: IBuilderQuery) =>
			arr.map((item, idx) => {
				if (index === idx) {
					if (!panelType) {
						return newQueryItem;
					}
					const queryItem = cloneDeep(item) as IBuilderQuery;
					const propsRequired =
						panelTypeDataSourceFormValuesMap[panelType as keyof PartialPanelTypes]?.[
							queryItem.dataSource
						].builder.queryData;

					propsRequired?.push('dataSource');
					propsRequired?.forEach((p: any) => {
						set(queryItem, p, get(newQueryItem, p));
					});
					return queryItem;
				}

				return item;
			}),
		[panelType],
	);

	const handleSetQueryItemData = useCallback(
		(
			index: number,
			type: EQueryType.PROM | EQueryType.CLICKHOUSE,
			newQueryData: IPromQLQuery | IClickHouseQuery,
		) => {
			setCurrentQuery((prevState) => {
				const updatedQueryBuilderData = updateQueryBuilderData(
					prevState[type],
					index,
					newQueryData,
				);

				return {
					...prevState,
					[type]: updatedQueryBuilderData,
				};
			});
			// eslint-disable-next-line sonarjs/no-identical-functions
			setSupersetQuery((prevState) => {
				const updatedQueryBuilderData = updateQueryBuilderData(
					prevState[type],
					index,
					newQueryData,
				);

				return {
					...prevState,
					[type]: updatedQueryBuilderData,
				};
			});
		},
		[updateQueryBuilderData],
	);

	const handleSetQueryData = useCallback(
		(index: number, newQueryData: IBuilderQuery): void => {
			setCurrentQuery((prevState) => {
				const updatedQueryBuilderData = updateQueryBuilderData(
					prevState.builder.queryData,
					index,
					newQueryData,
				);

				return {
					...prevState,
					builder: {
						...prevState.builder,
						queryData: updatedQueryBuilderData,
					},
				};
			});
			// eslint-disable-next-line sonarjs/no-identical-functions
			setSupersetQuery((prevState) => {
				const updatedQueryBuilderData = updateSuperSetQueryBuilderData(
					prevState.builder.queryData,
					index,
					newQueryData,
				);

				return {
					...prevState,
					builder: {
						...prevState.builder,
						queryData: updatedQueryBuilderData,
					},
				};
			});
		},
		[updateQueryBuilderData, updateSuperSetQueryBuilderData],
	);

	const handleSetTraceOperatorData = useCallback(
		(index: number, traceOperatorData: IBuilderTraceOperator): void => {
			setCurrentQuery((prevState) => {
				const updatedTraceOperatorBuilderData = updateQueryBuilderData(
					prevState.builder.queryTraceOperator,
					index,
					traceOperatorData,
				);

				return {
					...prevState,
					builder: {
						...prevState.builder,
						queryTraceOperator: updatedTraceOperatorBuilderData,
					},
				};
			});
			// eslint-disable-next-line sonarjs/no-identical-functions
			setSupersetQuery((prevState) => {
				const updatedTraceOperatorBuilderData = updateQueryBuilderData(
					prevState.builder.queryTraceOperator,
					index,
					traceOperatorData,
				);

				return {
					...prevState,
					builder: {
						...prevState.builder,
						queryTraceOperator: updatedTraceOperatorBuilderData,
					},
				};
			});
		},
		[updateQueryBuilderData],
	);

	const handleSetFormulaData = useCallback(
		(index: number, formulaData: IBuilderFormula): void => {
			setCurrentQuery((prevState) => {
				const updatedFormulasBuilderData = updateQueryBuilderData(
					prevState.builder.queryFormulas,
					index,
					formulaData,
				);

				return {
					...prevState,
					builder: {
						...prevState.builder,
						queryFormulas: updatedFormulasBuilderData,
					},
				};
			});
			// eslint-disable-next-line sonarjs/no-identical-functions
			setSupersetQuery((prevState) => {
				const updatedFormulasBuilderData = updateQueryBuilderData(
					prevState.builder.queryFormulas,
					index,
					formulaData,
				);

				return {
					...prevState,
					builder: {
						...prevState.builder,
						queryFormulas: updatedFormulasBuilderData,
					},
				};
			});
		},
		[updateQueryBuilderData],
	);

	const isStagedQueryUpdated = useCallback(
		(
			viewData: ViewProps[] | undefined,
			viewKey: string,
			options: OptionsQuery,
		): boolean =>
			isQueryUpdatedInView({
				currentPanelType: panelType,
				data: viewData,
				stagedQuery,
				viewKey,
				options,
			}),
		[panelType, stagedQuery],
	);

	const { safeNavigate } = useSafeNavigate({
		preventSameUrlNavigation: false,
	});

	const redirectWithQueryBuilderData = useCallback(
		(
			query: Partial<Query>,
			searchParams?: Record<string, unknown>,
			redirectingUrl?: typeof ROUTES[keyof typeof ROUTES],
			shouldNotStringify?: boolean,
		) => {
			const queryType =
				!query.queryType || !Object.values(EQueryType).includes(query.queryType)
					? EQueryType.QUERY_BUILDER
					: query.queryType;

			const builder =
				!query.builder || query.builder.queryData?.length === 0
					? initialQueryState.builder
					: query.builder;

			const promql =
				!query.promql || query.promql.length === 0
					? initialQueryState.promql
					: query.promql;

			const clickhouseSql =
				!query.clickhouse_sql || query.clickhouse_sql.length === 0
					? initialQueryState.clickhouse_sql
					: query.clickhouse_sql;

			const currentGeneratedQuery: Query = {
				queryType,
				builder,
				promql,
				clickhouse_sql: clickhouseSql,
				id: uuid(),
				unit: query.unit || initialQueryState.unit,
			};

			const pagination = urlQuery.get(QueryParams.pagination);

			if (pagination) {
				const parsedPagination = JSON.parse(pagination);

				urlQuery.set(
					QueryParams.pagination,
					JSON.stringify({
						limit: parsedPagination.limit,
						offset: 0,
					}),
				);
			}

			urlQuery.set(
				QueryParams.compositeQuery,
				encodeURIComponent(JSON.stringify(currentGeneratedQuery)),
			);

			if (searchParams) {
				Object.keys(searchParams).forEach((param) =>
					urlQuery.set(
						param,
						shouldNotStringify
							? (searchParams[param] as string)
							: JSON.stringify(searchParams[param]),
					),
				);
			}
			// Remove Hidden Filters from URL query parameters on query change
			urlQuery.delete(QueryParams.activeLogId);

			const generatedUrl = redirectingUrl
				? `${redirectingUrl}?${urlQuery}`
				: `${location.pathname}?${urlQuery}`;

			safeNavigate(generatedUrl);
		},
		[location.pathname, safeNavigate, urlQuery],
	);

	const handleSetConfig = useCallback(
		(newPanelType: PANEL_TYPES, dataSource: DataSource | null) => {
			setPanelType(newPanelType);
			setInitialDataSource(dataSource);
		},
		[],
	);

	const handleRunQuery = useCallback(() => {
		const isExplorer =
			location.pathname === ROUTES.LOGS_EXPLORER ||
			location.pathname === ROUTES.TRACES_EXPLORER;
		if (isExplorer) {
			setCalledFromHandleRunQuery(true);
		}
		const currentQueryData = {
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: currentQuery.builder.queryData.map((item) => ({
					...item,
					filter: {
						...item.filter,
						expression:
							item.filter?.expression.trim() === ''
								? ''
								: item.filter?.expression ?? '',
					},
					filters: {
						items: [],
						op: 'AND',
					},
				})),
			},
		};

		redirectWithQueryBuilderData({
			...{
				...currentQueryData,
				...updateStepInterval({
					builder: currentQueryData.builder,
					clickhouse_sql: currentQueryData.clickhouse_sql,
					promql: currentQueryData.promql,
					id: currentQueryData.id,
					queryType,
					unit: currentQueryData.unit,
				}),
			},
			queryType,
		});
	}, [currentQuery, location.pathname, queryType, redirectWithQueryBuilderData]);

	useEffect(() => {
		if (location.pathname !== currentPathnameRef.current) {
			currentPathnameRef.current = location.pathname;

			setStagedQuery(null);
			// reset the last used query to 0 when navigating away from the page
			setLastUsedQuery(0);
			setCalledFromHandleRunQuery(false);
		}
	}, [location.pathname]);

	// Separate useEffect to handle initQueryBuilderData after pathname changes
	useEffect(() => {
		if (!compositeQueryParam) return;

		// Only run initQueryBuilderData if we're not in the middle of a pathname change
		if (location.pathname === currentPathnameRef.current) {
			if (stagedQuery && stagedQuery.id === compositeQueryParam.id) {
				return;
			}

			const { isValid, validData } = replaceIncorrectObjectFields(
				compositeQueryParam,
				initialQueriesMap.metrics,
			);

			if (!isValid) {
				redirectWithQueryBuilderData(validData);
			} else {
				initQueryBuilderData(compositeQueryParam);
			}
		}
	}, [
		initQueryBuilderData,
		redirectWithQueryBuilderData,
		compositeQueryParam,
		stagedQuery,
		location.pathname,
	]);

	const resetQuery = (newCurrentQuery?: QueryState): void => {
		setStagedQuery(null);

		if (newCurrentQuery) {
			setCurrentQuery(newCurrentQuery);
			setSupersetQuery(newCurrentQuery);
		}
	};

	const handleOnUnitsChange = useCallback(
		(unit: string) => {
			setCurrentQuery((prevState) => ({
				...prevState,
				unit,
			}));
			setSupersetQuery((prevState) => ({
				...prevState,
				unit,
			}));
		},
		[setCurrentQuery, setSupersetQuery],
	);

	const query: Query = useMemo(
		() => ({
			...currentQuery,
			queryType,
		}),
		[currentQuery, queryType],
	);

	const superQuery: Query = useMemo(
		() => ({
			...supersetQuery,
			queryType,
		}),
		[supersetQuery, queryType],
	);

	const isEnabledQuery = useMemo(() => !!stagedQuery && !!panelType, [
		stagedQuery,
		panelType,
	]);

	const contextValues: QueryBuilderContextType = useMemo(
		() => ({
			currentQuery: query,
			supersetQuery: superQuery,
			lastUsedQuery,
			setLastUsedQuery,
			setSupersetQuery,
			stagedQuery,
			initialDataSource,
			panelType,
			isEnabledQuery,
			handleSetQueryData,
			handleSetTraceOperatorData,
			handleSetFormulaData,
			handleSetQueryItemData,
			handleSetConfig,
			removeQueryBuilderEntityByIndex,
			removeQueryTypeItemByIndex,
			removeAllQueryBuilderEntities,
			cloneQuery,
			addNewBuilderQuery,
			addNewFormula,
			addTraceOperator,
			removeTraceOperator,
			addNewQueryItem,
			redirectWithQueryBuilderData,
			handleRunQuery,
			resetQuery,
			updateAllQueriesOperators,
			isDefaultQuery,
			updateQueriesData,
			initQueryBuilderData,
			handleOnUnitsChange,
			isStagedQueryUpdated,
		}),
		[
			query,
			superQuery,
			lastUsedQuery,
			stagedQuery,
			initialDataSource,
			panelType,
			isEnabledQuery,
			handleSetQueryData,
			handleSetTraceOperatorData,
			handleSetFormulaData,
			handleSetQueryItemData,
			handleSetConfig,
			removeQueryBuilderEntityByIndex,
			removeQueryTypeItemByIndex,
			removeAllQueryBuilderEntities,
			cloneQuery,
			addNewBuilderQuery,
			addNewFormula,
			addTraceOperator,
			removeTraceOperator,
			addNewQueryItem,
			redirectWithQueryBuilderData,
			handleRunQuery,
			updateAllQueriesOperators,
			isDefaultQuery,
			updateQueriesData,
			initQueryBuilderData,
			handleOnUnitsChange,
			isStagedQueryUpdated,
		],
	);

	return (
		<QueryBuilderContext.Provider value={contextValues}>
			{children}
		</QueryBuilderContext.Provider>
	);
}
