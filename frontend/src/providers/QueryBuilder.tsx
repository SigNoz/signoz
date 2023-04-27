import {
	alphabet,
	formulasNames,
	initialFormulaBuilderFormValues,
	initialQueryBuilderFormValues,
	mapOfOperators,
	MAX_FORMULAS,
	MAX_QUERIES,
} from 'constants/queryBuilder';
import { createNewBuilderItemName } from 'lib/newQueryBuilder/createNewBuilderItemName';
import React, {
	createContext,
	PropsWithChildren,
	useCallback,
	useMemo,
	useState,
} from 'react';
// ** Types
// TODO: Rename Types on the Reusable type for any source
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
	resetQueryBuilderData: () => {},
	handleSetQueryData: () => {},
	handleSetFormulaData: () => {},
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
	// TODO: this is temporary. It will be used when we have fixed dataSource and need create new query with this data source
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [initialDataSource, setInitialDataSource] = useState<DataSource | null>(
		null,
	);

	// TODO: when initialDataSource will be setuped, on create button initial dataSource will from initialDataSource
	const [queryBuilderData, setQueryBuilderData] = useState<QueryBuilderData>({
		queryData: [],
		queryFormulas: [],
	});

	// ** Method for resetting query builder data
	const resetQueryBuilderData = useCallback((): void => {
		setQueryBuilderData(initialQueryBuilderData);
	}, []);

	// ** Method for setuping query builder data
	// ** Before setuping transform data from backend to frontend format
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
							aggregateOperator: mapOfOperators[initialDataSource][0],
					  }
					: {}),
			};

			return newQuery;
		},
		[initialDataSource],
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
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

	const contextValues: QueryBuilderContextType = useMemo(
		() => ({
			queryBuilderData,
			initialDataSource,
			resetQueryBuilderData,
			handleSetQueryData,
			handleSetFormulaData,
			initQueryBuilderData,
			setupInitialDataSource,
			removeEntityByIndex,
			addNewQuery,
			addNewFormula,
		}),
		[
			queryBuilderData,
			initialDataSource,
			resetQueryBuilderData,
			handleSetQueryData,
			handleSetFormulaData,
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
