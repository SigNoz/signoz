import {
	alphabet,
	formulasNames,
	initialFormulaBuilderFormValues,
	initialQuery,
	initialQueryBuilderFormValues,
	initialSingleQueryMap,
	MAX_FORMULAS,
	MAX_QUERIES,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { createNewBuilderItemName } from 'lib/newQueryBuilder/createNewBuilderItemName';
import { getOperatorsBySourceAndPanelType } from 'lib/newQueryBuilder/getOperatorsBySourceAndPanelType';
import {
	createContext,
	PropsWithChildren,
	useCallback,
	useMemo,
	useState,
} from 'react';
// ** Types
import {
	IBuilderFormula,
	IBuilderQuery,
	IClickHouseQuery,
	IPromQLQuery,
	QueryState,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import {
	DataSource,
	QueryBuilderContextType,
	QueryBuilderData,
} from 'types/common/queryBuilder';

export const QueryBuilderContext = createContext<QueryBuilderContextType>({
	currentQuery: initialQuery,
	queryType: EQueryType.QUERY_BUILDER,
	initialDataSource: null,
	panelType: PANEL_TYPES.TIME_SERIES,
	resetQueryBuilderData: () => {},
	resetQueryBuilderInfo: () => {},
	handleSetQueryData: () => {},
	handleSetFormulaData: () => {},
	handleSetQueryItemData: () => {},
	handleSetPanelType: () => {},
	handleSetQueryType: () => {},
	initQueryBuilderData: () => {},
	setupInitialDataSource: () => {},
	removeQueryBuilderEntityByIndex: () => {},
	removeQueryTypeItemByIndex: () => {},
	addNewBuilderQuery: () => {},
	addNewFormula: () => {},
	addNewQueryItem: () => {},
});

export function QueryBuilderProvider({
	children,
}: PropsWithChildren): JSX.Element {
	const [initialDataSource, setInitialDataSource] = useState<DataSource | null>(
		null,
	);

	const [panelType, setPanelType] = useState<GRAPH_TYPES>(
		PANEL_TYPES.TIME_SERIES,
	);

	const [currentQuery, setCurrentQuery] = useState<QueryState>(initialQuery);

	const [queryType, setQueryType] = useState<EQueryType>(
		EQueryType.QUERY_BUILDER,
	);

	const handleSetQueryType = useCallback((newQueryType: EQueryType) => {
		setQueryType(newQueryType);
	}, []);

	const resetQueryBuilderInfo = useCallback((): void => {
		setInitialDataSource(null);
		setPanelType(PANEL_TYPES.TIME_SERIES);
	}, []);

	const resetQueryBuilderData = useCallback(() => {
		setCurrentQuery(initialQuery);
	}, []);

	const initQueryBuilderData = useCallback(
		(query: QueryState, queryType: EQueryType): void => {
			setCurrentQuery(query);
			setQueryType(queryType);
		},
		[],
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

			const newQuery: IBuilderQuery = {
				...initialQueryBuilderFormValues,
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

	const contextValues: QueryBuilderContextType = useMemo(
		() => ({
			currentQuery,
			queryType,
			initialDataSource,
			panelType,
			resetQueryBuilderData,
			resetQueryBuilderInfo,
			handleSetQueryData,
			handleSetFormulaData,
			handleSetQueryItemData,
			handleSetPanelType,
			handleSetQueryType,
			initQueryBuilderData,
			setupInitialDataSource,
			removeQueryBuilderEntityByIndex,
			removeQueryTypeItemByIndex,
			addNewBuilderQuery,
			addNewFormula,
			addNewQueryItem,
		}),
		[
			currentQuery,
			initialDataSource,
			panelType,
			queryType,
			resetQueryBuilderData,
			resetQueryBuilderInfo,
			handleSetQueryData,
			handleSetFormulaData,
			handleSetQueryItemData,
			handleSetPanelType,
			handleSetQueryType,
			initQueryBuilderData,
			setupInitialDataSource,
			removeQueryBuilderEntityByIndex,
			removeQueryTypeItemByIndex,
			addNewBuilderQuery,
			addNewFormula,
			addNewQueryItem,
		],
	);

	return (
		<QueryBuilderContext.Provider value={contextValues}>
			{children}
		</QueryBuilderContext.Provider>
	);
}
