import { getGlobalConfig } from 'api/globalConfig/globalConfig';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import { GlobalConfigDataProps } from 'types/api/globalConfig/types';

export const useGetGlobalConfig = (
	isEnabled: boolean,
): UseQueryResult<AxiosResponse<GlobalConfigDataProps>, AxiosError> =>
	useQuery<AxiosResponse<GlobalConfigDataProps>, AxiosError>({
		queryKey: ['getGlobalConfig'],
		queryFn: () => getGlobalConfig(),
		enabled: isEnabled,
	});
