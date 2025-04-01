import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { useSafeNavigate } from './useSafeNavigate';
import useUrlQuery from './useUrlQuery';

const useUrlQueryData = <T>(
	queryKey: string,
	defaultData?: T,
): UseUrlQueryData<T> => {
	const location = useLocation();
	const urlQuery = useUrlQuery();
	const { safeNavigate } = useSafeNavigate();

	const query = useMemo(() => urlQuery.get(queryKey), [urlQuery, queryKey]);

	const queryData: T = useMemo(() => (query ? JSON.parse(query) : defaultData), [
		query,
		defaultData,
	]);

	const redirectWithQuery = useCallback(
		(newQueryData: T): void => {
			const newQuery = JSON.stringify(newQueryData);

			// Create a new URLSearchParams object with the current URL's search params
			// This ensures we're working with the most up-to-date URL state
			const currentUrlQuery = new URLSearchParams(window.location.search);

			// Update or add the specified query parameter with the new serialized data
			currentUrlQuery.set(queryKey, newQuery);

			// Construct the new URL by combining the current pathname with the updated query string
			const generatedUrl = `${location.pathname}?${currentUrlQuery.toString()}`;

			safeNavigate(generatedUrl);
		},
		[location.pathname, queryKey, safeNavigate],
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
