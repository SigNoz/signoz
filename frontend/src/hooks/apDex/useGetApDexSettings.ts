import { getApDexSettings } from 'api/metrics/ApDex/getApDexSettings';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import { ApDexPayloadProps } from 'types/api/metrics/getApDex';

export const useGetApDexSettings = (
	servicename: string,
): UseQueryResult<AxiosResponse<ApDexPayloadProps[]>, AxiosError> => {
	const queryKey = [{ servicename }];
	return useQuery<AxiosResponse<ApDexPayloadProps[]>, AxiosError>({
		queryFn: async () => getApDexSettings(servicename),
		queryKey,
	});
};
