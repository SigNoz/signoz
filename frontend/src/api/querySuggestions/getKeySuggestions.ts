import axios from 'api';
import { AxiosResponse } from 'axios';
import {
	QueryKeyRequestProps,
	QueryKeySuggestionsResponseProps,
} from 'types/api/querySuggestions/types';

/**
 * @deprecated Use the generated `useGetFieldsKeys` hook (or `getFieldsKeys` fetcher) from
 * `api/generated/services/fields` instead. This hand-written client targets the
 * same endpoint and will be removed once call sites migrate.
 *
 * Part of https://github.com/SigNoz/engineering-pod/issues/5289, add a comment or update when removing this method.
 */
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
		metricNamespace = '',
	} = props;

	const encodedSignal = encodeURIComponent(signal);
	const encodedSearchText = encodeURIComponent(searchText);
	const encodedMetricName = encodeURIComponent(metricName);
	const encodedFieldContext = encodeURIComponent(fieldContext);
	const encodedFieldDataType = encodeURIComponent(fieldDataType);
	const encodedSource = encodeURIComponent(signalSource);
	const encodedMetricNamespace = encodeURIComponent(metricNamespace);

	return axios.get(
		`/fields/keys?signal=${encodedSignal}&searchText=${encodedSearchText}&metricName=${encodedMetricName}&fieldContext=${encodedFieldContext}&fieldDataType=${encodedFieldDataType}&source=${encodedSource}&metricNamespace=${encodedMetricNamespace}`,
	);
};
