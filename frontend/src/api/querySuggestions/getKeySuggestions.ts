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
		`/fields/keys?signal=${props.signal}&name=${props.name}&metricName=${props.metricName}`,
	);
