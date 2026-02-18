import axios from 'api';
import { AxiosResponse } from 'axios';
import store from 'store';
import {
	QueryKeyRequestProps,
	QueryKeySuggestionsResponseProps,
} from 'types/api/querySuggestions/types';

export const getKeySuggestions = (
	props: QueryKeyRequestProps,
): Promise<AxiosResponse<QueryKeySuggestionsResponseProps>> => {
	const {
		signal = '',
		searchText = '',
		metricName = '',
		fieldContext = '',
		fieldDataType = '',
		signalSource = '',
	} = props;

	const { globalTime } = store.getState();
	const resolvedTimeRange = {
		startUnixMilli: Math.floor(globalTime.minTime / 1000000),
		endUnixMilli: Math.floor(globalTime.maxTime / 1000000),
	};

	const encodedSignal = encodeURIComponent(signal);
	const encodedSearchText = encodeURIComponent(searchText);
	const encodedMetricName = encodeURIComponent(metricName);
	const encodedFieldContext = encodeURIComponent(fieldContext);
	const encodedFieldDataType = encodeURIComponent(fieldDataType);
	const encodedSource = encodeURIComponent(signalSource);

	let url = `/fields/keys?signal=${encodedSignal}&searchText=${encodedSearchText}&metricName=${encodedMetricName}&fieldContext=${encodedFieldContext}&fieldDataType=${encodedFieldDataType}&source=${encodedSource}`;

	if (resolvedTimeRange.startUnixMilli !== undefined) {
		url += `&startUnixMilli=${resolvedTimeRange.startUnixMilli}`;
	}
	if (resolvedTimeRange.endUnixMilli !== undefined) {
		url += `&endUnixMilli=${resolvedTimeRange.endUnixMilli}`;
	}

	return axios.get(url);
};
