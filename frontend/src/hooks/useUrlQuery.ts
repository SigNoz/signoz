import { useMemo } from 'react';
import { useAppLocation } from 'lib/router/useAppLocation';

function useUrlQuery(): URLSearchParams {
	const { search } = useAppLocation();

	return useMemo(() => new URLSearchParams(search), [search]);
}

export default useUrlQuery;
