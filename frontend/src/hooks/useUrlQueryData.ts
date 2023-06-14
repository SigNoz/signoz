import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

const useUrlQueryData = <T>(queryKey: string): UseUrlQueryData<T> => {
	const history = useHistory();
	const location = useLocation();
	const urlQuery = useUrlQuery();

	const query: string | null = urlQuery.get(queryKey);

	const queryData: T = useMemo(() => (query ? JSON.parse(query) : null), [
		query,
	]);

	const redirectWithQuery = useCallback(
		(newQueryData: T): void => {
			const newQuery = JSON.stringify(newQueryData);

			urlQuery.set(queryKey, newQuery);
			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			history.push(generatedUrl);
		},
		[history, location, urlQuery, queryKey],
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
