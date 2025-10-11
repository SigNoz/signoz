import getActive from 'api/v3/licenses/active/get';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';
import { LicenseResModel } from 'types/api/licensesV3/getActive';

const useActiveLicenseV3 = (isLoggedIn: boolean): UseLicense =>
	useQuery({
		queryFn: getActive,
		queryKey: [REACT_QUERY_KEY.GET_ACTIVE_LICENSE_V3],
		enabled: !!isLoggedIn,
		retry: false,
	});

type UseLicense = UseQueryResult<SuccessResponseV2<LicenseResModel>, APIError>;

export default useActiveLicenseV3;
