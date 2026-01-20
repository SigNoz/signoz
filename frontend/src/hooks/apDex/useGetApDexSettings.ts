import getApDexSettings from 'api/v1/settings/apdex/services/get';
import { useQuery, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';
import { ApDexPayloadAndSettingsProps } from 'types/api/metrics/getApDex';

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
