// ** Helpers
// ** Constants
import {
	initialQueryBuilderFormValues,
	mapOfOperators,
} from 'constants/queryBuilder';
import {
	createNewQueryName,
	MAX_QUERIES,
} from 'lib/newQueryBuilder/createNewQueryName';
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
	IBuilderQueryForm,
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
				const currentArray: (IBuilderQueryForm | IBuilderFormula)[] =
					prevState[type];
				return {
					...prevState,
					[type]: currentArray.filter((item, i) => index !== i),
				};
			});
		},
		[],
	);

	const createNewQuery = useCallback(
		(queries: IBuilderQueryForm[]): IBuilderQueryForm => {
			const existNames = queries.map((item) => item.queryName);

			const newQuery: IBuilderQueryForm = {
				...initialQueryBuilderFormValues,
				queryName: createNewQueryName(existNames),
				...(initialDataSource
					? {
							dataSource: initialDataSource,
							aggregateOperator: mapOfOperators[initialDataSource][0],
							expression: createNewQueryName(existNames),
					  }
					: {}),
			};

			return newQuery;
		},
		[initialDataSource],
	);

	const addNewQuery = useCallback(() => {
		setQueryBuilderData((prevState) => {
			if (prevState.queryData.length >= MAX_QUERIES) return prevState;

			const newQuery = createNewQuery(prevState.queryData);

			return { ...prevState, queryData: [...prevState.queryData, newQuery] };
		});
	}, [createNewQuery]);

	const setupInitialDataSource = useCallback(
		(newInitialDataSource: DataSource | null) =>
			setInitialDataSource(newInitialDataSource),
		[],
	);

	const updateQueryBuilderData = useCallback(
		(
			queries: IBuilderQueryForm[],
			index: number,
			newQueryData: IBuilderQueryForm,
		) => queries.map((item, idx) => (index === idx ? newQueryData : item)),
		[],
	);

	const handleSetQueryData = useCallback(
		(index: number, newQueryData: IBuilderQueryForm): void => {
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
		(index: number, formulaData: IBuilderFormula): void => {},
		[],
	);
	console.log(queryBuilderData.queryData);

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
		],
	);

	return (
		<QueryBuilderContext.Provider value={contextValues}>
			{children}
		</QueryBuilderContext.Provider>
	);
}
