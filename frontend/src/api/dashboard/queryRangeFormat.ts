import { ApiV3Instance as axios } from 'api';
import { ApiResponse } from 'types/api';
import { QueryRangePayload } from 'types/api/metrics/getQueryRange';

export const getQueryRangeFormat = (
	props?: Partial<QueryRangePayload>,
): Promise<QueryRangePayload> =>
	axios
		.post<ApiResponse<QueryRangePayload>>('/query_range/format', props)
		.then((res) => res.data.data);
