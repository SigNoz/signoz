import { useMemo } from 'react';
import { useLocation } from 'react-router-dom-v5-compat';

function useUrlQuery(): URLSearchParams {
	const { search } = useLocation();

	return useMemo(() => new URLSearchParams(search), [search]);
}

export default useUrlQuery;
