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
	startUnixMilli,
	endUnixMilli,
	existingQuery,
	options,
}: {
	key: string;
	signal: 'traces' | 'logs' | 'metrics';
	searchText?: string;
	signalSource?: string;
	options?: UseQueryOptions<
		AxiosResponse<QueryKeyValueSuggestionsResponseProps>,
		AxiosError
	>;
	metricName?: string;
	startUnixMilli?: number;
	endUnixMilli?: number;
	existingQuery?: string;
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
				signalSource: signalSource || '',
				metricName: metricName || '',
				startUnixMilli,
				endUnixMilli,
				existingQuery,
			}),
		...options,
	});
