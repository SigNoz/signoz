import { useLocation } from 'react-router-dom';

function useUrlQuery(): URLSearchParams {
	const { search } = useLocation();

	return new URLSearchParams(search);
}

export default useUrlQuery;
