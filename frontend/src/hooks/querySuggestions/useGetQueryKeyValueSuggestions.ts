import { getValueSuggestions } from 'api/querySuggestions/getValueSuggestion';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import { QueryKeyValueSuggestionsResponseProps } from 'types/api/querySuggestions/types';

export const useGetQueryKeyValueSuggestions = ({
	key,
	signal,
}: {
	key: string;
	signal: 'traces' | 'logs' | 'metrics';
}): UseQueryResult<
	AxiosResponse<QueryKeyValueSuggestionsResponseProps>,
	AxiosError
> =>
	useQuery<AxiosResponse<QueryKeyValueSuggestionsResponseProps>, AxiosError>({
		queryKey: ['queryKeyValueSuggestions', key, signal],
		queryFn: () => getValueSuggestions({ signal, key }),
	});
