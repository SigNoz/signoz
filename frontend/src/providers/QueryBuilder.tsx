import {
	alphabet,
	formulasNames,
	initialFormulaBuilderFormValues,
	initialQueryBuilderFormValues,
	MAX_FORMULAS,
	MAX_QUERIES,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { createNewBuilderItemName } from 'lib/newQueryBuilder/createNewBuilderItemName';
import { getOperatorsBySourceAndPanelType } from 'lib/newQueryBuilder/getOperatorsBySourceAndPanelType';
import React, {
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
} from 'types/api/queryBuilder/queryBuilderData';
import {
	DataSource,
	QueryBuilderContextType,
	QueryBuilderData,
} from 'types/common/queryBuilder';

export const QueryBuilderContext = createContext<QueryBuilderContextType>({
	queryBuilderData: { queryData: [], queryFormulas: [] },
	initialDataSource: null,
	panelType: PANEL_TYPES.TIME_SERIES,
	resetQueryBuilderData: () => {},
	resetQueryBuilderInfo: () => {},
	handleSetQueryData: () => {},
	handleSetFormulaData: () => {},
	handleSetPanelType: () => {},
	initQueryBuilderData: () => {},
	setupInitialDataSource: () => {},
	removeEntityByIndex: () => {},
	addNewQuery: () => {},
	addNewFormula: () => {},
});

const initialQueryBuilderData: QueryBuilderData = {
	queryData: [],
	queryFormulas: [],
};

export function QueryBuilderProvider({
	children,
}: PropsWithChildren): JSX.Element {
	const [initialDataSource, setInitialDataSource] = useState<DataSource | null>(
		null,
	);

	const [panelType, setPanelType] = useState<GRAPH_TYPES>(
		PANEL_TYPES.TIME_SERIES,
	);

	const [queryBuilderData, setQueryBuilderData] = useState<QueryBuilderData>({
		queryData: [],
		queryFormulas: [],
	});

	const resetQueryBuilderInfo = useCallback((): void => {
		setInitialDataSource(null);
		setPanelType(PANEL_TYPES.TIME_SERIES);
	}, []);

	const resetQueryBuilderData = useCallback(() => {
		setQueryBuilderData(initialQueryBuilderData);
	}, []);

	const initQueryBuilderData = useCallback(
		(queryBuilderData: QueryBuilderData): void => {
			setQueryBuilderData(queryBuilderData);
		},
		[],
	);

	const removeEntityByIndex = useCallback(
		(type: keyof QueryBuilderData, index: number) => {
			setQueryBuilderData((prevState) => {
				const currentArray: (IBuilderQuery | IBuilderFormula)[] = prevState[type];
				return {
					...prevState,
					[type]: currentArray.filter((item, i) => index !== i),
				};
			});
		},
		[],
	);

	const createNewQuery = useCallback(
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

	const createNewFormula = useCallback((formulas: IBuilderFormula[]) => {
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

	const addNewQuery = useCallback(() => {
		setQueryBuilderData((prevState) => {
			if (prevState.queryData.length >= MAX_QUERIES) return prevState;

			const newQuery = createNewQuery(prevState.queryData);

			return { ...prevState, queryData: [...prevState.queryData, newQuery] };
		});
	}, [createNewQuery]);

	const addNewFormula = useCallback(() => {
		setQueryBuilderData((prevState) => {
			if (prevState.queryFormulas.length >= MAX_FORMULAS) return prevState;

			const newFormula = createNewFormula(prevState.queryFormulas);

			return {
				...prevState,
				queryFormulas: [...prevState.queryFormulas, newFormula],
			};
		});
	}, [createNewFormula]);

	const setupInitialDataSource = useCallback(
		(newInitialDataSource: DataSource | null) =>
			setInitialDataSource(newInitialDataSource),
		[],
	);

	const updateQueryBuilderData = useCallback(
		(queries: IBuilderQuery[], index: number, newQueryData: IBuilderQuery) =>
			queries.map((item, idx) => (index === idx ? newQueryData : item)),
		[],
	);

	const updateFormulaBuilderData = useCallback(
		(formulas: IBuilderFormula[], index: number, newFormula: IBuilderFormula) =>
			formulas.map((item, idx) => (index === idx ? newFormula : item)),
		[],
	);

	const handleSetQueryData = useCallback(
		(index: number, newQueryData: IBuilderQuery): void => {
			setQueryBuilderData((prevState) => {
				const updatedQueryBuilderData = updateQueryBuilderData(
					prevState.queryData,
					index,
					newQueryData,
				);

				return {
					...prevState,
					queryData: updatedQueryBuilderData,
				};
			});
		},
		[updateQueryBuilderData],
	);
	const handleSetFormulaData = useCallback(
		(index: number, formulaData: IBuilderFormula): void => {
			setQueryBuilderData((prevState) => {
				const updatedFormulasBuilderData = updateFormulaBuilderData(
					prevState.queryFormulas,
					index,
					formulaData,
				);

				return {
					...prevState,
					queryFormulas: updatedFormulasBuilderData,
				};
			});
		},
		[updateFormulaBuilderData],
	);

	const handleSetPanelType = useCallback((newPanelType: GRAPH_TYPES) => {
		setPanelType(newPanelType);
	}, []);

	const contextValues: QueryBuilderContextType = useMemo(
		() => ({
			queryBuilderData,
			initialDataSource,
			panelType,
			resetQueryBuilderData,
			resetQueryBuilderInfo,
			handleSetQueryData,
			handleSetFormulaData,
			handleSetPanelType,
			initQueryBuilderData,
			setupInitialDataSource,
			removeEntityByIndex,
			addNewQuery,
			addNewFormula,
		}),
		[
			queryBuilderData,
			initialDataSource,
			panelType,
			resetQueryBuilderData,
			resetQueryBuilderInfo,
			handleSetQueryData,
			handleSetFormulaData,
			handleSetPanelType,
			initQueryBuilderData,
			setupInitialDataSource,
			removeEntityByIndex,
			addNewQuery,
			addNewFormula,
		],
	);

	return (
		<QueryBuilderContext.Provider value={contextValues}>
			{children}
		</QueryBuilderContext.Provider>
	);
}
