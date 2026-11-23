import type { UseQueryResult } from 'react-query';
import { useQuery } from 'react-query';
import {
	getActiveLicense,
	getGetActiveLicenseQueryKey,
} from 'api/generated/services/licenses';
import type APIError from 'types/api/error';
import type { LicenseResModel } from 'types/api/licensesV3/getActive';
import { toAPIError } from 'utils/errorUtils';

import { toLicenseResModel } from './utils';

const useActiveLicense = (
	isLoggedIn: boolean,
): UseQueryResult<LicenseResModel, APIError> =>
	useQuery({
		queryFn: async (): Promise<LicenseResModel> => {
			try {
				const response = await getActiveLicense();
				return toLicenseResModel(response.data);
			} catch (error) {
				throw toAPIError(error as Parameters<typeof toAPIError>[0]);
			}
		},
		queryKey: getGetActiveLicenseQueryKey(),
		enabled: !!isLoggedIn,
		retry: false,
	});

export default useActiveLicense;
