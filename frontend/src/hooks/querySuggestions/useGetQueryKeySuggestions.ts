import { getKeySuggestions } from 'api/querySuggestions/getKeySuggestions';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import { QueryKeySuggestionsResponseProps } from 'types/api/querySuggestions/types';

export const useGetQueryKeySuggestions = ({
	signal,
	searchText,
	metricName,
}: {
	signal: 'traces' | 'logs' | 'metrics';
	searchText: string;
	metricName?: string;
}): UseQueryResult<
	AxiosResponse<QueryKeySuggestionsResponseProps>,
	AxiosError
> =>
	useQuery<AxiosResponse<QueryKeySuggestionsResponseProps>, AxiosError>({
		queryKey: ['queryKeySuggestions', signal, searchText, metricName],
		queryFn: () => getKeySuggestions({ signal, searchText, metricName }),
	});
