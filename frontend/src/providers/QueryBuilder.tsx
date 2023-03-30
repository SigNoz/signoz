// ** Helpers
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
	MetricAggregateOperator,
	QueryBuilderContextType,
	QueryBuilderData,
} from 'types/common/queryBuilder';

export const QueryBuilderContext = createContext<QueryBuilderContextType>({
	queryBuilderData: { queryData: [], queryFormulas: [] },
	resetQueryBuilderData: () => {},
	handleSetQueryData: () => {},
	handleSetFormulaData: () => {},
	initQueryBuilderData: () => {},
});

const initialQueryBuilderData: QueryBuilderData = {
	queryData: [],
	queryFormulas: [],
};

export function QueryBuilderProvider({
	children,
}: PropsWithChildren): JSX.Element {
	// ** TODO: get queryId from url for getting data for query builder
	// ** TODO: type the params which will be used for request of the data for query builder

	const [queryBuilderData, setQueryBuilderData] = useState<QueryBuilderData>({
		// ** TODO temporary initial value for first query for testing first filters
		queryData: [
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			{
				dataSource: DataSource.METRICS,
				queryName: 'A',
				aggregateOperator: Object.values(MetricAggregateOperator)[0],
				aggregateAttribute: {
					dataType: null,
					key: '',
					isColumn: null,
					type: null,
				},
			},
		],
		queryFormulas: [],
	});

	// ** Method for resetting query builder data
	const resetQueryBuilderData = useCallback((): void => {
		setQueryBuilderData(initialQueryBuilderData);
	}, []);

	// ** Method for setupping query builder data
	const initQueryBuilderData = useCallback(
		(queryBuilderData: QueryBuilderData): void => {
			setQueryBuilderData(queryBuilderData);
		},
		[],
	);

	const handleSetQueryData = useCallback(
		(index: number, newQueryData: Partial<IBuilderQueryForm>): void => {
			const updatedQueryBuilderData = queryBuilderData.queryData.map((item, idx) =>
				index === idx ? { ...item, ...newQueryData } : item,
			);

			setQueryBuilderData((prevState) => ({
				...prevState,
				queryData: updatedQueryBuilderData,
			}));
		},
		[queryBuilderData],
	);
	const handleSetFormulaData = useCallback(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		(index: number, formulaData: IBuilderFormula): void => {},
		[],
	);

	// ** TODO: Discuss with Palash how the state of the queryBuilder and queryFormulas
	// ** TODO: should be filled from url

	// ** TODO: put these values and setter to the context value

	const contextValues: QueryBuilderContextType = useMemo(
		() => ({
			queryBuilderData,
			resetQueryBuilderData,
			handleSetQueryData,
			handleSetFormulaData,
			initQueryBuilderData,
		}),
		[
			queryBuilderData,
			resetQueryBuilderData,
			handleSetQueryData,
			handleSetFormulaData,
			initQueryBuilderData,
		],
	);

	return (
		<QueryBuilderContext.Provider value={contextValues}>
			{children}
		</QueryBuilderContext.Provider>
	);
}
