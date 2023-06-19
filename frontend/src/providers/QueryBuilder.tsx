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
import { COMPOSITE_QUERY } from 'constants/queryBuilderQueryNames';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
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
import { useHistory, useLocation } from 'react-router-dom';
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
import { v4 as uuid } from 'uuid';

export const QueryBuilderContext = createContext<QueryBuilderContextType>({
	currentQuery: initialQueriesMap.metrics,
	stagedQuery: initialQueriesMap.metrics,
	initialDataSource: null,
	panelType: PANEL_TYPES.TIME_SERIES,
	handleSetQueryData: () => {},
	handleSetFormulaData: () => {},
	handleSetQueryItemData: () => {},
	handleSetPanelType: () => {},
	setupInitialDataSource: () => {},
	removeQueryBuilderEntityByIndex: () => {},
	removeQueryTypeItemByIndex: () => {},
	addNewBuilderQuery: () => {},
	addNewFormula: () => {},
	addNewQueryItem: () => {},
	redirectWithQueryBuilderData: () => {},
	handleRunQuery: () => {},
	resetStagedQuery: () => {},
});

export function QueryBuilderProvider({
	children,
}: PropsWithChildren): JSX.Element {
	const urlQuery = useUrlQuery();
	const history = useHistory();
	const location = useLocation();

	const compositeQueryParam = useGetCompositeQueryParam();

	const [initialDataSource, setInitialDataSource] = useState<DataSource | null>(
		null,
	);

	const [panelType, setPanelType] = useState<GRAPH_TYPES>(
		PANEL_TYPES.TIME_SERIES,
	);

	const [currentQuery, setCurrentQuery] = useState<QueryState>(
		initialQueryState,
	);
	const [stagedQuery, setStagedQuery] = useState<Query | null>(null);

	const [queryType, setQueryType] = useState<EQueryType>(
		EQueryType.QUERY_BUILDER,
	);

	const initQueryBuilderData = useCallback(
		(query: Query): void => {
			const { queryType: newQueryType, ...queryState } = query;

			const builder: QueryBuilderData = {
				queryData: queryState.builder.queryData.map((item) => ({
					...initialQueryBuilderFormValuesMap[
						initialDataSource || DataSource.METRICS
					],
					...item,
				})),
				queryFormulas: queryState.builder.queryFormulas.map((item) => ({
					...initialFormulaBuilderFormValues,
					...item,
				})),
			};

			const promql: IPromQLQuery[] = queryState.promql.map((item) => ({
				...initialQueryPromQLData,
				...item,
			}));

			const clickHouse: IClickHouseQuery[] = queryState.clickhouse_sql.map(
				(item) => ({
					...initialClickHouseData,
					...item,
				}),
			);

			const type = newQueryType || EQueryType.QUERY_BUILDER;

			const newQueryState: QueryState = {
				clickhouse_sql: clickHouse,
				promql,
				builder: {
					...builder,
					queryData: builder.queryData.map((q) => ({
						...q,
						groupBy: q.groupBy.map(({ id: _, ...item }) => ({
							...item,
							id: createIdFromObjectFields(item, baseAutoCompleteIdKeysOrder),
						})),
						aggregateAttribute: {
							...q.aggregateAttribute,
							id: createIdFromObjectFields(
								q.aggregateAttribute,
								baseAutoCompleteIdKeysOrder,
							),
						},
					})),
				},
				id: queryState.id,
			};

			const nextQuery: Query = { ...newQueryState, queryType: type };

			setStagedQuery(nextQuery);
			setCurrentQuery(newQueryState);
			setQueryType(type);
		},
		[initialDataSource],
	);

	const removeQueryBuilderEntityByIndex = useCallback(
		(type: keyof QueryBuilderData, index: number) => {
			setCurrentQuery((prevState) => {
				const currentArray: (IBuilderQuery | IBuilderFormula)[] =
					prevState.builder[type];
				return {
					...prevState,
					builder: {
						...prevState.builder,
						[type]: currentArray.filter((_, i) => index !== i),
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
				...(initialDataSource
					? {
							dataSource: initialDataSource,
							aggregateOperator: getOperatorsBySourceAndPanelType({
								dataSource: initialDataSource,
								panelType,
							})[0].value,
					  }
					: {}),
			};

			return newQuery;
		},
		[initialDataSource, panelType],
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

	const setupInitialDataSource = useCallback(
		(newInitialDataSource: DataSource | null) =>
			setInitialDataSource(newInitialDataSource),
		[],
	);

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

	const handleSetPanelType = useCallback((newPanelType: GRAPH_TYPES) => {
		setPanelType(newPanelType);
	}, []);

	const redirectWithQueryBuilderData = useCallback(
		(query: Partial<Query>, searchParams?: Record<string, unknown>) => {
			const currentGeneratedQuery: Query = {
				queryType:
					!query.queryType || !Object.values(EQueryType).includes(query.queryType)
						? EQueryType.QUERY_BUILDER
						: query.queryType,
				builder:
					!query.builder || query.builder.queryData.length === 0
						? initialQueryState.builder
						: query.builder,
				promql:
					!query.promql || query.promql.length === 0
						? initialQueryState.promql
						: query.promql,
				clickhouse_sql:
					!query.clickhouse_sql || query.clickhouse_sql.length === 0
						? initialQueryState.clickhouse_sql
						: query.clickhouse_sql,
				id: uuid(),
			};

			urlQuery.set(COMPOSITE_QUERY, JSON.stringify(currentGeneratedQuery));

			if (searchParams) {
				Object.keys(searchParams).forEach((param) =>
					urlQuery.set(param, JSON.stringify(searchParams[param])),
				);
			}

			const generatedUrl = `${location.pathname}?${urlQuery}`;

			history.push(generatedUrl);
		},
		[history, location, urlQuery],
	);

	const handleRunQuery = useCallback(() => {
		redirectWithQueryBuilderData({ ...currentQuery, queryType });
	}, [redirectWithQueryBuilderData, currentQuery, queryType]);

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

	const contextValues: QueryBuilderContextType = useMemo(
		() => ({
			currentQuery: query,
			stagedQuery,
			initialDataSource,
			panelType,
			handleSetQueryData,
			handleSetFormulaData,
			handleSetQueryItemData,
			handleSetPanelType,
			setupInitialDataSource,
			removeQueryBuilderEntityByIndex,
			removeQueryTypeItemByIndex,
			addNewBuilderQuery,
			addNewFormula,
			addNewQueryItem,
			redirectWithQueryBuilderData,
			handleRunQuery,
			resetStagedQuery,
		}),
		[
			query,
			stagedQuery,
			initialDataSource,
			panelType,
			handleSetQueryData,
			handleSetFormulaData,
			handleSetQueryItemData,
			handleSetPanelType,
			setupInitialDataSource,
			removeQueryBuilderEntityByIndex,
			removeQueryTypeItemByIndex,
			addNewBuilderQuery,
			addNewFormula,
			addNewQueryItem,
			redirectWithQueryBuilderData,
			handleRunQuery,
			resetStagedQuery,
		],
	);

	return (
		<QueryBuilderContext.Provider value={contextValues}>
			{children}
		</QueryBuilderContext.Provider>
	);
}
