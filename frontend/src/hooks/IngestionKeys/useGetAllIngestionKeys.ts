import { getAllIngestionKeys } from 'api/IngestionKeys/getAllIngestionKeys';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import { AllIngestionKeyProps } from 'types/api/ingestionKeys/types';

export const useGetAllIngestionsKeys = (): UseQueryResult<
	AxiosResponse<AllIngestionKeyProps>,
	AxiosError
> =>
	useQuery<AxiosResponse<AllIngestionKeyProps>, AxiosError>({
		queryKey: ['IngestionKeys'],
		queryFn: () => getAllIngestionKeys(),
	});
