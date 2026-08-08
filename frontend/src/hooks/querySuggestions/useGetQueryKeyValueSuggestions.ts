import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { getValueSuggestions } from 'api/querySuggestions/getValueSuggestion';
import { AxiosError, AxiosResponse } from 'axios';
import { QueryKeyValueSuggestionsResponseProps } from 'types/api/querySuggestions/types';

export const useGetQueryKeyValueSuggestions = ({
	key,
	signal,
	searchText,
	signalSource,
	metricName,
	type,
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
	/** POC / AI O11y: forwarded as `type` on /fields/values */
	type?: string;
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
			type,
		],
		queryFn: () =>
			getValueSuggestions({
				signal,
				key,
				searchText: searchText || '',
				signalSource: signalSource as 'meter' | '',
				metricName: metricName || '',
				type,
			}),
		...options,
	});
