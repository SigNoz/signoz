import getActive from 'api/licensesV3/getActive';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { LicenseV3ResModel } from 'types/api/licensesV3/getActive';

const useActiveLicenseV3 = (userEmail: string): UseLicense =>
	useQuery({
		queryFn: getActive,
		queryKey: [REACT_QUERY_KEY.GET_ACTIVE_LICENSE_V3, userEmail],
		enabled: !!userEmail,
	});

type UseLicense = UseQueryResult<
	SuccessResponse<LicenseV3ResModel> | ErrorResponse,
	unknown
>;

export default useActiveLicenseV3;
