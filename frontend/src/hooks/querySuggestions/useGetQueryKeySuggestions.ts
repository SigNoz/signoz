import { getKeySuggestions } from 'api/querySuggestions/getKeySuggestions';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import { QueryKeySuggestionsResponseProps } from 'types/api/querySuggestions/types';

export const useGetQueryKeySuggestions = ({
	signal,
}: {
	signal: string;
}): UseQueryResult<
	AxiosResponse<QueryKeySuggestionsResponseProps>,
	AxiosError
> =>
	useQuery<AxiosResponse<QueryKeySuggestionsResponseProps>, AxiosError>({
		queryKey: ['queryKeySuggestions'],
		queryFn: () => getKeySuggestions({ signal }),
	});
