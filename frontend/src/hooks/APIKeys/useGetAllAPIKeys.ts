import { getAllAPIKeys } from 'api/APIKeys/getAllAPIKeys';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import { AllAPIKeyProps } from 'types/api/pat/types';

export const useGetAllAPIKeys = (): UseQueryResult<
	AxiosResponse<AllAPIKeyProps>,
	AxiosError
> =>
	useQuery<AxiosResponse<AllAPIKeyProps>, AxiosError>({
		queryKey: ['APIKeys'],
		queryFn: () => getAllAPIKeys(),
	});
