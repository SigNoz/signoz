import { getValueSuggestions } from 'api/querySuggestions/getValueSuggestion';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { QueryKeyValueSuggestionsResponseProps } from 'types/api/querySuggestions/types';

export const useGetQueryKeyValueSuggestions = ({
	key,
	signal,
	searchText,
	signalSource,
	metricName,
	options,
}: {
	key: string;
	signal: 'traces' | 'logs' | 'metrics';
	searchText?: string;
	signalSource?: 'meter' | '';
	options?: UseQueryOptions<
		AxiosResponse<QueryKeyValueSuggestionsResponseProps>,
		AxiosError
	>;
	metricName?: string;
}): UseQueryResult<
	AxiosResponse<QueryKeyValueSuggestionsResponseProps>,
	AxiosError
> =>
	useQuery<AxiosResponse<QueryKeyValueSuggestionsResponseProps>, AxiosError>({
		queryKey: [
			'queryKeyValueSuggestions',
			key,
			signal,
			searchText,
			signalSource,
			metricName,
		],
		queryFn: () =>
			getValueSuggestions({
				signal,
				key,
				searchText: searchText || '',
				signalSource: signalSource as 'meter' | '',
				metricName: metricName || '',
			}),
		...options,
	});
