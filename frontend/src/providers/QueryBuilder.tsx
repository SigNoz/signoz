import {
	alphabet,
	baseAutoCompleteIdKeysOrder,
	formulasNames,
	initialClickHouseData,
	initialFormulaBuilderFormValues,
	initialQueriesMap,
	initialQueryBuilderFormValuesMap,
	initialQueryPromQLData,
	initialQueryState,
	initialSingleQueryMap,
	MAX_FORMULAS,
	MAX_QUERIES,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { queryParamNamesMap } from 'constants/queryBuilderQueryNames';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { updateStepInterval } from 'hooks/queryBuilder/useStepInterval';
import useUrlQuery from 'hooks/useUrlQuery';
import { createIdFromObjectFields } from 'lib/createIdFromObjectFields';
import { createNewBuilderItemName } from 'lib/newQueryBuilder/createNewBuilderItemName';
import { getOperatorsBySourceAndPanelType } from 'lib/newQueryBuilder/getOperatorsBySourceAndPanelType';
import { replaceIncorrectObjectFields } from 'lib/replaceIncorrectObjectFields';
import {
	createContext,
	PropsWithChildren,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
// ** Types
import {
	IBuilderFormula,
	IBuilderQuery,
	IClickHouseQuery,
	IPromQLQuery,
	Query,
	QueryState,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import {
	DataSource,
	QueryBuilderContextType,
	QueryBuilderData,
} from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { v4 as uuid } from 'uuid';

export const QueryBuilderContext = createContext<QueryBuilderContextType>({
	currentQuery: initialQueriesMap.metrics,
	stagedQuery: initialQueriesMap.metrics,
	initialDataSource: null,
	panelType: PANEL_TYPES.TIME_SERIES,
	isEnabledQuery: false,
	handleSetQueryData: () => {},
	handleSetFormulaData: () => {},
	handleSetQueryItemData: () => {},
	handleSetConfig: () => {},
	removeQueryBuilderEntityByIndex: () => {},
	removeQueryTypeItemByIndex: () => {},
	addNewBuilderQuery: () => {},
	addNewFormula: () => {},
	addNewQueryItem: () => {},
	redirectWithQueryBuilderData: () => {},
	handleRunQuery: () => {},
	resetStagedQuery: () => {},
	updateAllQueriesOperators: () => initialQueriesMap.metrics,
	updateQueriesData: () => initialQueriesMap.metrics,
	initQueryBuilderData: () => {},
});

export function QueryBuilderProvider({
	children,
}: PropsWithChildren): JSX.Element {
	const urlQuery = useUrlQuery();
	const history = useHistory();
	const location = useLocation();
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const compositeQueryParam = useGetCompositeQueryParam();
	const { queryType: queryTypeParam, ...queryState } =
		compositeQueryParam || initialQueriesMap.metrics;

	const [initialDataSource, setInitialDataSource] = useState<DataSource | null>(
		null,
	);

	const [panelType, setPanelType] = useState<PANEL_TYPES | null>(null);

	const [currentQuery, setCurrentQuery] = useState<QueryState>(
		queryState || initialQueryState,
	);
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
				.includes(queryData.aggregateOperator);

			if (!isCurrentOperatorAvailableInList) {
				return { ...queryData, aggregateOperator: initialOperators[0].value };
			}

			return queryData;
		},
		[],
	);

	const prepareQueryBuilderData = useCallback(
		(query: Query): Query => {
			const builder: QueryBuilderData = {
				queryData: query.builder.queryData.map((item) => ({
					...initialQueryBuilderFormValuesMap[
						initialDataSource || DataSource.METRICS
					],
					...item,
				})),
				queryFormulas: query.builder.queryFormulas.map((item) => ({
					...initialFormulaBuilderFormValues,
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
							item.aggregateAttribute,
							baseAutoCompleteIdKeysOrder,
						),
					},
				};

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
			};

			const nextQuery: Query = {
				...newQueryState,
				queryType: query.queryType,
			};

			return nextQuery;
		},
		[initialDataSource],
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
		(query: Query, panelType: PANEL_TYPES, dataSource: DataSource): Query => {
			const queryData = query.builder.queryData.map((item) =>
				getElementWithActualOperator(item, dataSource, panelType),
			);

			return { ...query, builder: { ...query.builder, queryData } };
		},

		[getElementWithActualOperator],
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
				const currentArray: (IBuilderQuery | IBuilderFormula)[] =
					prevState.builder[type];

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

	const removeQueryTypeItemByIndex = useCallback(
		(type: EQueryType.PROM | EQueryType.CLICKHOUSE, index: number) => {
			setCurrentQuery((prevState) => {
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
		},
		[createNewQueryTypeItem],
	);

	const addNewBuilderQuery = useCallback(() => {
		setCurrentQuery((prevState) => {
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
	}, [createNewBuilderFormula]);

	const updateQueryBuilderData: <T>(
		arr: T[],
		index: number,
		newQueryItem: T,
	) => T[] = useCallback(
		(arr, index, newQueryItem) =>
			arr.map((item, idx) => (index === idx ? newQueryItem : item)),
		[],
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
		},
		[updateQueryBuilderData],
	);

	const redirectWithQueryBuilderData = useCallback(
		(query: Partial<Query>, searchParams?: Record<string, unknown>) => {
			const queryType =
				!query.queryType || !Object.values(EQueryType).includes(query.queryType)
					? EQueryType.QUERY_BUILDER
					: query.queryType;

			const builder =
				!query.builder || query.builder.queryData.length === 0
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
			};

			urlQuery.set(
				queryParamNamesMap.compositeQuery,
				encodeURIComponent(JSON.stringify(currentGeneratedQuery)),
			);

			if (searchParams) {
				Object.keys(searchParams).forEach((param) =>
					urlQuery.set(param, JSON.stringify(searchParams[param])),
				);
			}

			const generatedUrl = `${location.pathname}?${urlQuery}`;

			history.push(generatedUrl);
		},
		[history, location.pathname, urlQuery],
	);

	const handleSetConfig = useCallback(
		(newPanelType: PANEL_TYPES, dataSource: DataSource | null) => {
			setPanelType(newPanelType);
			setInitialDataSource(dataSource);
		},
		[],
	);

	const handleRunQuery = useCallback(() => {
		redirectWithQueryBuilderData({
			...{
				...currentQuery,
				...updateStepInterval(
					{
						builder: currentQuery.builder,
						clickhouse_sql: currentQuery.clickhouse_sql,
						promql: currentQuery.promql,
						id: currentQuery.id,
						queryType,
					},
					maxTime,
					minTime,
				),
			},
			queryType,
		});
	}, [currentQuery, queryType, maxTime, minTime, redirectWithQueryBuilderData]);

	const resetStagedQuery = useCallback(() => {
		setStagedQuery(null);
	}, []);

	useEffect(() => {
		if (!compositeQueryParam) return;

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
	}, [
		initQueryBuilderData,
		redirectWithQueryBuilderData,
		compositeQueryParam,
		stagedQuery,
	]);

	const query: Query = useMemo(
		() => ({
			...currentQuery,
			queryType,
		}),
		[currentQuery, queryType],
	);

	const isEnabledQuery = useMemo(() => !!stagedQuery && !!panelType, [
		stagedQuery,
		panelType,
	]);

	const contextValues: QueryBuilderContextType = useMemo(
		() => ({
			currentQuery: query,
			stagedQuery,
			initialDataSource,
			panelType,
			isEnabledQuery,
			handleSetQueryData,
			handleSetFormulaData,
			handleSetQueryItemData,
			handleSetConfig,
			removeQueryBuilderEntityByIndex,
			removeQueryTypeItemByIndex,
			addNewBuilderQuery,
			addNewFormula,
			addNewQueryItem,
			redirectWithQueryBuilderData,
			handleRunQuery,
			resetStagedQuery,
			updateAllQueriesOperators,
			updateQueriesData,
			initQueryBuilderData,
		}),
		[
			query,
			stagedQuery,
			initialDataSource,
			panelType,
			isEnabledQuery,
			handleSetQueryData,
			handleSetFormulaData,
			handleSetQueryItemData,
			handleSetConfig,
			removeQueryBuilderEntityByIndex,
			removeQueryTypeItemByIndex,
			addNewBuilderQuery,
			addNewFormula,
			addNewQueryItem,
			redirectWithQueryBuilderData,
			handleRunQuery,
			resetStagedQuery,
			updateAllQueriesOperators,
			updateQueriesData,
			initQueryBuilderData,
		],
	);

	return (
		<QueryBuilderContext.Provider value={contextValues}>
			{children}
		</QueryBuilderContext.Provider>
	);
}
