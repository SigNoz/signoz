import axios from 'api';
import { AxiosResponse } from 'axios';
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

	const encodedSignal = encodeURIComponent(signal);
	const encodedSearchText = encodeURIComponent(searchText);
	const encodedMetricName = encodeURIComponent(metricName);
	const encodedFieldContext = encodeURIComponent(fieldContext);
	const encodedFieldDataType = encodeURIComponent(fieldDataType);
	const encodedSource = encodeURIComponent(signalSource);

	return axios.get(
		`/fields/keys?signal=${encodedSignal}&searchText=${encodedSearchText}&metricName=${encodedMetricName}&fieldContext=${encodedFieldContext}&fieldDataType=${encodedFieldDataType}&source=${encodedSource}`,
	);
};
