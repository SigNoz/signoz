import { useMemo } from 'react';
import { useLocation } from 'react-router';

// TODO: useSearchParams -> https://reactrouter.com/api/hooks/useSearchParams#usesearchparams
function useUrlQuery(): URLSearchParams {
	const { search } = useLocation();

	return useMemo(() => new URLSearchParams(search), [search]);
}

export default useUrlQuery;
