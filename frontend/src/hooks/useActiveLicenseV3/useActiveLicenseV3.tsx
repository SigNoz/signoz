import getActive from 'api/licensesV3/getActive';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useAppContext } from 'providers/App/App';
import { useQuery, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { LicenseV3ResModel } from 'types/api/licensesV3/getActive';

const useActiveLicenseV3 = (): UseLicense => {
	const { user } = useAppContext();
	// const { user } = useSelector<AppState, AppReducer>((state) => state.app);

	return useQuery({
		queryFn: getActive,
		queryKey: [REACT_QUERY_KEY.GET_ACTIVE_LICENSE_V3, user?.email],
		enabled: !!user?.email,
	});
};

type UseLicense = UseQueryResult<
	SuccessResponse<LicenseV3ResModel> | ErrorResponse,
	unknown
>;

export default useActiveLicenseV3;
