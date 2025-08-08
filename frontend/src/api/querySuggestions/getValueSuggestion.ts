import axios from 'api';
import { AxiosResponse } from 'axios';
import {
	QueryKeyValueRequestProps,
	QueryKeyValueSuggestionsResponseProps,
} from 'types/api/querySuggestions/types';

export const getValueSuggestions = (
	props: QueryKeyValueRequestProps,
): Promise<AxiosResponse<QueryKeyValueSuggestionsResponseProps>> => {
	const { signal, key, searchText, signalSource } = props;

	const encodedSignal = encodeURIComponent(signal);
	const encodedKey = encodeURIComponent(key);
	const encodedSearchText = encodeURIComponent(searchText);
	const encodedSource = encodeURIComponent(signalSource || '');

	return axios.get(
		`/fields/values?signal=${encodedSignal}&name=${encodedKey}&searchText=${encodedSearchText}&source=${encodedSource}`,
	);
};
