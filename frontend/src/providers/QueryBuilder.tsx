import React, {
	createContext,
	PropsWithChildren,
	useCallback,
	useMemo,
	useState,
} from 'react';
import { useParams } from 'react-router-dom';

// ** TODO: temporary types for context, fix it during development
export type QueryBuilderContextType = {
	queryBuilderData: unknown[];
	resetQueryBuilderData: () => void;
	handleSetQueryBuilderData: () => void;
};

export const QueryBuilderContext = createContext<QueryBuilderContextType>({
	queryBuilderData: [
		{
			queryData: '',
			queryFormulas: '',
		},
	],
	resetQueryBuilderData: () => {},
	handleSetQueryBuilderData: () => {},
});

const initialQueryBuilderData: unknown[] = [
	{
		queryData: '',
		queryFormulas: '',
	},
];

export function QueryBuilderProvider({
	children,
}: PropsWithChildren): JSX.Element {
	// ** TODO: get queryId from url for getting data for query builder
	// ** TODO: type the params which will be used for request of the data for query builder
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const params = useParams();

	// ** TODO: create state for queryBuilder
	// ** TODO: create state for queryFormulas

	// ** TODO: Find out the types of the queryBuilder state
	// ** TODO: Check exist version of the functionality
	const [queryBuilderData, setQueryBuilderData] = useState<unknown[]>([
		{
			queryData: '',
			queryFormulas: '',
		},
	]);

	const resetQueryBuilderData = useCallback((): void => {
		setQueryBuilderData(initialQueryBuilderData);
	}, []);

	const handleSetQueryBuilderData = useCallback((): void => {}, []);
	// ** TODO: Discuss with Palash how the state of the queryBuilder and queryFormulas
	// ** TODO: should be filled from url

	// ** TODO: create set function for state

	// ** TODO: put these values and setter to the context value

	const contextValues: QueryBuilderContextType = useMemo(
		() => ({
			queryBuilderData,
			resetQueryBuilderData,
			handleSetQueryBuilderData,
		}),
		[queryBuilderData, resetQueryBuilderData, handleSetQueryBuilderData],
	);

	return (
		<QueryBuilderContext.Provider value={contextValues}>
			{children}
		</QueryBuilderContext.Provider>
	);
}
