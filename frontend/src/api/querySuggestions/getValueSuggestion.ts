import axios from 'api';
import { AxiosResponse } from 'axios';
import {
	QueryKeyValueRequestProps,
	QueryKeyValueSuggestionsResponseProps,
} from 'types/api/querySuggestions/types';

export const getValueSuggestions = (
	props: QueryKeyValueRequestProps,
): Promise<AxiosResponse<QueryKeyValueSuggestionsResponseProps>> => {
	const {
		signal,
		key,
		searchText,
		signalSource,
		metricName,
		startUnixMilli,
		endUnixMilli,
		existingQuery,
	} = props;

	const encodedSignal = encodeURIComponent(signal);
	const encodedKey = encodeURIComponent(key);
	const encodedMetricName = encodeURIComponent(metricName || '');
	const encodedSearchText = encodeURIComponent(searchText);
	const encodedSource = encodeURIComponent(signalSource || '');

	let url = `/fields/values?signal=${encodedSignal}&name=${encodedKey}&searchText=${encodedSearchText}&metricName=${encodedMetricName}&source=${encodedSource}`;

	if (startUnixMilli !== undefined) {
		url += `&startUnixMilli=${startUnixMilli}`;
	}
	if (endUnixMilli !== undefined) {
		url += `&endUnixMilli=${endUnixMilli}`;
	}
	if (existingQuery) {
		url += `&existingQuery=${encodeURIComponent(existingQuery)}`;
	}

	return axios.get(url);
};
