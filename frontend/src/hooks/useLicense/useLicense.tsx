import getAll from 'api/licenses/getAll';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/licenses/getAll';
import AppReducer from 'types/reducer/app';

const useLicense = (): UseLicense => {
	const { user } = useSelector<AppState, AppReducer>((state) => state.app);

	return useQuery({
		queryFn: getAll,
		queryKey: [REACT_QUERY_KEY.GET_ALL_LICENCES, user?.email],
		enabled: !!user?.email,
	});
};

type UseLicense = UseQueryResult<
	SuccessResponse<PayloadProps> | ErrorResponse,
	unknown
>;

export default useLicense;
