import axios from 'api';
import { AxiosResponse } from 'axios';
import {
	QueryKeyValueRequestProps,
	QueryKeyValueSuggestionsResponseProps,
} from 'types/api/querySuggestions/types';

export const getValueSuggestions = (
	props: QueryKeyValueRequestProps,
): Promise<AxiosResponse<QueryKeyValueSuggestionsResponseProps>> => {
	const { signal, key, searchText, signalSource, metricName } = props;

	const encodedSignal = encodeURIComponent(signal);
	const encodedKey = encodeURIComponent(key);
	const encodedMetricName = encodeURIComponent(metricName || '');
	const encodedSearchText = encodeURIComponent(searchText);
	const encodedSource = encodeURIComponent(signalSource || '');

	return axios.get(
		`/fields/values?signal=${encodedSignal}&name=${encodedKey}&searchText=${encodedSearchText}&metricName=${encodedMetricName}&source=${encodedSource}`,
	);
};
