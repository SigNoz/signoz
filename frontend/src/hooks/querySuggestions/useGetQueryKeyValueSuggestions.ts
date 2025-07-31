import { getValueSuggestions } from 'api/querySuggestions/getValueSuggestion';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import { QueryKeyValueSuggestionsResponseProps } from 'types/api/querySuggestions/types';

export const useGetQueryKeyValueSuggestions = ({
	key,
	signal,
	searchText,
	metricName,
}: {
	key: string;
	signal: 'traces' | 'logs' | 'metrics';
	searchText?: string;
	metricName?: string;
}): UseQueryResult<
	AxiosResponse<QueryKeyValueSuggestionsResponseProps>,
	AxiosError
> =>
	useQuery<AxiosResponse<QueryKeyValueSuggestionsResponseProps>, AxiosError>({
		queryKey: ['queryKeyValueSuggestions', key, signal, searchText, metricName],
		queryFn: () =>
			getValueSuggestions({
				signal,
				key,
				searchText: searchText || '',
				metricName: metricName || '',
			}),
	});
