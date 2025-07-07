import axios from 'api';
import { AxiosResponse } from 'axios';
import {
	QueryKeyValueRequestProps,
	QueryKeyValueSuggestionsResponseProps,
} from 'types/api/querySuggestions/types';

export const getValueSuggestions = (
	props: QueryKeyValueRequestProps,
): Promise<AxiosResponse<QueryKeyValueSuggestionsResponseProps>> =>
	axios.get(
		`/fields/values?signal=${encodeURIComponent(
			props.signal,
		)}&name=${encodeURIComponent(props.key)}&searchText=${encodeURIComponent(
			props.searchText,
		)}`,
	);
