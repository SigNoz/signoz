import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
import { getValueSuggestions } from 'api/querySuggestions/getValueSuggestion';
import { AxiosError, AxiosResponse } from 'axios';
import { AppState } from 'store/reducers';
import { QueryKeyValueSuggestionsResponseProps } from 'types/api/querySuggestions/types';
import { GlobalReducer } from 'types/reducer/globalTime';

export const useGetQueryKeyValueSuggestions = ({
	key,
	signal,
	searchText,
	signalSource,
	metricName,
	existingQuery,
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
	existingQuery?: string;
}): UseQueryResult<
	AxiosResponse<QueryKeyValueSuggestionsResponseProps>,
	AxiosError
> => {
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	return useQuery<
		AxiosResponse<QueryKeyValueSuggestionsResponseProps>,
		AxiosError
	>({
		queryKey: [
			'queryKeyValueSuggestions',
			key,
			signal,
			searchText,
			signalSource,
			metricName,
			Math.floor(minTime / 1e9),
			Math.floor(maxTime / 1e9),
		],
		queryFn: () =>
			getValueSuggestions({
				signal,
				key,
				searchText: searchText || '',
				signalSource: signalSource as 'meter' | '',
				metricName: metricName || '',
				existingQuery,
			}),
		...options,
	});
};
