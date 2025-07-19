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
	} = props;

	return axios.get(
		`/fields/keys?signal=${signal}&searchText=${searchText}&metricName=${metricName}&fieldContext=${fieldContext}&fieldDataType=${fieldDataType}`,
	);
};
