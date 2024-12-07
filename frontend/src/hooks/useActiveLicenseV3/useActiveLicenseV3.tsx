import getActive from 'api/licensesV3/getActive';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { LicenseV3ResModel } from 'types/api/licensesV3/getActive';
import AppReducer from 'types/reducer/app';

const useActiveLicenseV3 = (): UseLicense => {
	const { user } = useSelector<AppState, AppReducer>((state) => state.app);

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
