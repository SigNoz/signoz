import { getAllIngestionKeys } from 'api/IngestionKeys/getAllIngestionKeys';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import {
	AllIngestionKeyProps,
	GetIngestionKeyProps,
} from 'types/api/ingestionKeys/types';

export const useGetAllIngestionsKeys = (
	props: GetIngestionKeyProps,
): UseQueryResult<AxiosResponse<AllIngestionKeyProps>, AxiosError> =>
	useQuery<AxiosResponse<AllIngestionKeyProps>, AxiosError>({
		queryKey: [`IngestionKeys-${props.page}-${props.search}`],
		queryFn: () => getAllIngestionKeys(props),
	});
