import axios from 'api';
import { AxiosResponse } from 'axios';
import {
	QueryKeyValueRequestProps,
	QueryKeyValueSuggestionsResponseProps,
} from 'types/api/querySuggestions/types';

/**
 * @deprecated Use the generated `useGetFieldsValues` hook (or `getFieldsValues` fetcher) from
 * `api/generated/services/fields` instead. This hand-written client targets the
 * same endpoint and will be removed once call sites migrate.
 *
 * Part of https://github.com/SigNoz/engineering-pod/issues/5289, add a comment or update when removing this method.
 */
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
