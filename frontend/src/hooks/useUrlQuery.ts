import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

function useUrlQuery() {
	const { search } = useLocation();

	return useMemo(() => new URLSearchParams(search), [search]);
}

export default useUrlQuery;
