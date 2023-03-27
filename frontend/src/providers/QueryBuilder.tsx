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

export type QueryBuilderData = {
	queryData: IBuilderQuery[];
	queryFormulas: IBuilderFormula[];
};

// ** TODO: temporary types for context, fix it during development
export type QueryBuilderContextType = {
	queryBuilderData: QueryBuilderData;
	resetQueryBuilderData: () => void;
	handleSetQueryData: (index: number, queryData: IBuilderQuery) => void;
	handleSetFormulaData: (index: number, formulaData: IBuilderFormula) => void;
};

export const QueryBuilderContext = createContext<QueryBuilderContextType>({
	queryBuilderData: { queryData: [], queryFormulas: [] },
	resetQueryBuilderData: () => {},
	handleSetQueryData: () => {},
	handleSetFormulaData: () => {},
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
		queryData: [],
		queryFormulas: [],
	});

	// ** TODO: Also in the future need to add AddFormula and AddQuery and remove them.

	const resetQueryBuilderData = useCallback((): void => {
		setQueryBuilderData(initialQueryBuilderData);
	}, []);

	const handleSetQueryData = useCallback(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		(index: number, queryData: IBuilderQuery): void => {},
		[],
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
		}),
		[
			queryBuilderData,
			resetQueryBuilderData,
			handleSetQueryData,
			handleSetFormulaData,
		],
	);

	return (
		<QueryBuilderContext.Provider value={contextValues}>
			{children}
		</QueryBuilderContext.Provider>
	);
}
