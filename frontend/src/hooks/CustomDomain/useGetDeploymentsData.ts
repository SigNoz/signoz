import { getDeploymentsData } from 'api/customDomain/getDeploymentsData';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import { DeploymentsDataProps } from 'types/api/customDomain/types';

export const useGetDeploymentsData = (): UseQueryResult<
	AxiosResponse<DeploymentsDataProps>,
	AxiosError
> =>
	useQuery<AxiosResponse<DeploymentsDataProps>, AxiosError>({
		queryKey: ['getDeploymentsData'],
		queryFn: () => getDeploymentsData(),
	});
