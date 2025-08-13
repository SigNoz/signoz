import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from 'react';

// Types for the context state
export type AggregationOption = { func: string; arg: string };

interface QueryBuilderV2ContextType {
	searchText: string;
	setSearchText: (text: string) => void;
	aggregationOptionsMap: Record<string, AggregationOption[]>;
	setAggregationOptions: (
		queryName: string,
		options: AggregationOption[],
	) => void;
	getAggregationOptions: (queryName: string) => AggregationOption[];
	aggregationInterval: string;
	setAggregationInterval: (interval: string) => void;
	queryAddValues: any; // Replace 'any' with a more specific type if available
	setQueryAddValues: (values: any) => void;
}

const QueryBuilderV2Context = createContext<
	QueryBuilderV2ContextType | undefined
>(undefined);

export function QueryBuilderV2Provider({
	children,
}: {
	children: ReactNode;
}): JSX.Element {
	const [searchText, setSearchText] = useState('');
	const [aggregationOptionsMap, setAggregationOptionsMap] = useState<
		Record<string, AggregationOption[]>
	>({});
	const [aggregationInterval, setAggregationInterval] = useState('');
	const [queryAddValues, setQueryAddValues] = useState<any>(null); // Replace 'any' if you have a type

	const setAggregationOptions = useCallback(
		(queryName: string, options: AggregationOption[]): void => {
			setAggregationOptionsMap((prev) => ({
				...prev,
				[queryName]: options,
			}));
		},
		[],
	);

	const getAggregationOptions = useCallback(
		(queryName: string): AggregationOption[] =>
			aggregationOptionsMap[queryName] || [],
		[aggregationOptionsMap],
	);

	return (
		<QueryBuilderV2Context.Provider
			value={useMemo(
				() => ({
					searchText,
					setSearchText,
					aggregationOptionsMap,
					setAggregationOptions,
					getAggregationOptions,
					aggregationInterval,
					setAggregationInterval,
					queryAddValues,
					setQueryAddValues,
				}),
				[
					searchText,
					aggregationOptionsMap,
					aggregationInterval,
					queryAddValues,
					getAggregationOptions,
					setAggregationOptions,
				],
			)}
		>
			{children}
		</QueryBuilderV2Context.Provider>
	);
}

export const useQueryBuilderV2Context = (): QueryBuilderV2ContextType => {
	const context = useContext(QueryBuilderV2Context);
	if (!context) {
		throw new Error(
			'useQueryBuilderV2Context must be used within a QueryBuilderV2Provider',
		);
	}
	return context;
};
