import { getApDexSettings } from 'api/metrics/ApDex/getApDexSettings';
import { AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import { ApDexPayloadProps } from 'types/api/metrics/getApDex';

export const useGetApDexSettings = (
	servicename: string,
): UseQueryResult<AxiosResponse<ApDexPayloadProps[]>> => {
	const queryKey = [{ servicename }];
	return useQuery<AxiosResponse<ApDexPayloadProps[]>>({
		queryFn: async () => getApDexSettings(servicename),
		queryKey,
	});
};
