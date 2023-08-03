import { getApDexSettings } from 'api/metrics/ApDex/getApDexSettings';
import { useQuery, UseQueryResult } from 'react-query';
import { ApDexPayloadProps } from 'types/api/metrics/getApDex';

export const useGetApDexSettings = (
	servicename: string,
): UseQueryResult<ApDexPayloadProps> => {
	const queryKey = [{ servicename }];
	return useQuery<ApDexPayloadProps>({
		queryFn: async () => getApDexSettings(servicename),
		queryKey,
	});
};
