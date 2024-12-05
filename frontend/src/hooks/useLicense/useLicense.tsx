import getAll from 'api/licenses/getAll';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useAppContext } from 'providers/App/App';
import { useQuery, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/licenses/getAll';

const useLicense = (): UseLicense => {
	const { user } = useAppContext();
	// const { user } = useSelector<AppState, AppReducer>((state) => state.app);

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
