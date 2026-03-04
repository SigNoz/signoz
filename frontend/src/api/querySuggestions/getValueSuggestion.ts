import axios from 'api';
import { AxiosResponse } from 'axios';
import store from 'store';
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
		existingQuery,
	} = props;

	const { globalTime } = store.getState();
	const resolvedTimeRange = {
		startUnixMilli: Math.floor(globalTime.minTime / 1000000),
		endUnixMilli: Math.floor(globalTime.maxTime / 1000000),
	};

	const encodedSignal = encodeURIComponent(signal);
	const encodedKey = encodeURIComponent(key);
	const encodedMetricName = encodeURIComponent(metricName || '');
	const encodedSearchText = encodeURIComponent(searchText);
	const encodedSource = encodeURIComponent(signalSource || '');

	let url = `/fields/values?signal=${encodedSignal}&name=${encodedKey}&searchText=${encodedSearchText}&metricName=${encodedMetricName}&source=${encodedSource}`;

	if (resolvedTimeRange.startUnixMilli !== undefined) {
		url += `&startUnixMilli=${resolvedTimeRange.startUnixMilli}`;
	}
	if (resolvedTimeRange.endUnixMilli !== undefined) {
		url += `&endUnixMilli=${resolvedTimeRange.endUnixMilli}`;
	}
	if (existingQuery) {
		url += `&existingQuery=${encodeURIComponent(existingQuery)}`;
	}

	return axios.get(url);
};
