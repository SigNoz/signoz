import { getValueSuggestions } from 'api/querySuggestions/getValueSuggestion';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse } from 'react-router-dom-v5-compat';
import { SuccessResponse } from 'types/api';
import { QueryKeyValueSuggestionsResponseProps } from 'types/api/querySuggestions/types';

export const useGetQueryKeyValueSuggestions = ({
	key,
	signal,
	searchText,
	signalSource,
	metricName,
}: {
	key: string;
	signal: 'traces' | 'logs' | 'metrics';
	searchText?: string;
	signalSource?: 'meter' | '';
	options?: UseQueryOptions<
		SuccessResponse<QueryKeyValueSuggestionsResponseProps> | ErrorResponse
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
	});
