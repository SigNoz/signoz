import { useQuery, UseQueryResult } from 'react-query';
import getGlobalConfig from 'api/globalConfig/getGlobalConfig';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';
import { GlobalConfigData } from 'types/api/globalConfig/types';

export const useGetGlobalConfig = (): UseQueryResult<
	SuccessResponseV2<GlobalConfigData>,
	APIError
> =>
	useQuery<SuccessResponseV2<GlobalConfigData>, APIError>({
		queryKey: ['getGlobalConfig'],
		queryFn: () => getGlobalConfig(),
	});
