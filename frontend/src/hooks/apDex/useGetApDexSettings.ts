import type { UseQueryResult } from 'react-query';
import { useQuery } from 'react-query';
import getApDexSettings from 'api/v1/settings/apdex/services/get';
import type { SuccessResponseV2 } from 'types/api';
import type APIError from 'types/api/error';
import type { ApDexPayloadAndSettingsProps } from 'types/api/metrics/getApDex';

export const useGetApDexSettings = (
	servicename: string,
): UseQueryResult<
	SuccessResponseV2<ApDexPayloadAndSettingsProps[]>,
	APIError
> =>
	useQuery<SuccessResponseV2<ApDexPayloadAndSettingsProps[]>, APIError>({
		queryKey: [{ servicename }],
		queryFn: async () => getApDexSettings(servicename),
	});
