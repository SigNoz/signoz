import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

const useUrlQueryData = <T>(
	queryKey: string,
	defaultData?: T,
): UseUrlQueryData<T> => {
	const [searchParams, setSearchParams] = useSearchParams();

	const query = useMemo(() => searchParams.get(queryKey), [
		searchParams,
		queryKey,
	]);

	const queryData: T = useMemo(() => (query ? JSON.parse(query) : defaultData), [
		query,
		defaultData,
	]);

	const redirectWithQuery = useCallback(
		(newQueryData: T): void => {
			const newQuery = JSON.stringify(newQueryData);

			// Create a new URLSearchParams object with the current URL's search params
			// This ensures we're working with the most up-to-date URL state
			// const currentUrlQuery = new URLSearchParams(location.search);
			// TODO: Smit remove above comment after test
			// Update or add the specified query parameter with the new serialized data
			// Immediately propogate navigation event instead of waiting for the routing cycle
			requestAnimationFrame(() => {
				setSearchParams(
					(params: URLSearchParams): URLSearchParams => {
						params.set(queryKey, newQuery);
						return params;
					},
				);
			});
		},
		[queryKey, setSearchParams],
	);

	return {
		query,
		queryData,
		redirectWithQuery,
	};
};

interface UseUrlQueryData<T> {
	query: string | null;
	queryData: T;
	redirectWithQuery: (newQueryData: T) => void;
}

export default useUrlQueryData;
