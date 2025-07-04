import axios from 'api';
import { AxiosResponse } from 'axios';
import {
	QueryKeyRequestProps,
	QueryKeySuggestionsResponseProps,
} from 'types/api/querySuggestions/types';

export const getKeySuggestions = (
	props: QueryKeyRequestProps,
): Promise<AxiosResponse<QueryKeySuggestionsResponseProps>> =>
	axios.get(
		`/fields/keys?signal=${props.signal}&searchText=${
			props.searchText
		}&metricName=${props.metricName ?? ''}&fieldContext=${
			props.fieldContext ?? ''
		}&fieldDataType=${props.fieldDataType ?? ''}`,
	);
