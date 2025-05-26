import list from 'api/v1/pats/list';
import { useQuery, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';
import { APIKeyProps } from 'types/api/pat/types';

export const useGetAllAPIKeys = (): UseQueryResult<
	SuccessResponseV2<APIKeyProps[]>,
	APIError
> =>
	useQuery<SuccessResponseV2<APIKeyProps[]>, APIError>({
		queryKey: ['APIKeys'],
		queryFn: () => list(),
	});
