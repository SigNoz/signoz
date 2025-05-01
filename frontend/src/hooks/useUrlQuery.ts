import { useSearchParams } from 'react-router';

// TODO: Migrate to useSearchParams -> https://reactrouter.com/api/hooks/useSearchParams#usesearchparams
function useUrlQuery(): URLSearchParams {
	const [params] = useSearchParams();

	return params;
}

export default useUrlQuery;
