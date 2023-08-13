import { getApDexSettings } from 'api/metrics/ApDex/getApDexSettings';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import { ApDexPayloadAndSettingsProps } from 'types/api/metrics/getApDex';

export const useGetApDexSettings = (
	servicename: string,
): UseQueryResult<AxiosResponse<ApDexPayloadAndSettingsProps[]>, AxiosError> =>
	useQuery<AxiosResponse<ApDexPayloadAndSettingsProps[]>, AxiosError>({
		queryKey: [{ servicename }],
		queryFn: async () => getApDexSettings(servicename),
	});
