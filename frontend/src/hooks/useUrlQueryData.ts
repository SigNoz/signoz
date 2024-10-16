import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import useUrlQuery from './useUrlQuery';

const useUrlQueryData = <T>(
	queryKey: string,
	defaultData?: T,
): UseUrlQueryData<T> => {
	const history = useHistory();
	const location = useLocation();
	const urlQuery = useUrlQuery();

	const query = useMemo(() => urlQuery.get(queryKey), [urlQuery, queryKey]);

	const queryData: T = useMemo(() => (query ? JSON.parse(query) : defaultData), [
		query,
		defaultData,
	]);

	const redirectWithQuery = useCallback(
		(newQueryData: T): void => {
			const newQuery = JSON.stringify(newQueryData);

			// Create a new URLSearchParams to get the latest URL state
			const currentUrlQuery = new URLSearchParams(window.location.search);

			// Update the query parameter
			currentUrlQuery.set(queryKey, newQuery);

			// Generate the new URL with updated parameters
			const generatedUrl = `${location.pathname}?${currentUrlQuery.toString()}`;
			history.replace(generatedUrl);
		},
		[history, location.pathname, queryKey],
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
