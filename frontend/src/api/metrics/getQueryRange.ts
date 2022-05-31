import { ApiV2Instance as axios } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	TagKeyProps,
	TagKeysPayloadProps,
	TagValueProps,
	TagValuesPayloadProps,
} from 'types/api/metrics/getResourceAttributes';

export const getResourceAttributesTagValues = async (
	props: TagValueProps,
): Promise<SuccessResponse<TagValuesPayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.post(`/metrics/query_range`, {
			dataSource: 0,
			start: 1653130217335,
			end: 1653132017335,
			step: 60,
			compositeMetricQuery: {
				queryType: 0,
				builderQueries: {
					a: {
						queryName: 'a',
						metricName: 'system_disk_operations',
						tagFilters: {
							op: 'AND',
							items: [
								{
									key: 'host_name',
									op: 'like',
									value: '',
								},
								{
									key: 'device',
									op: 'nin',
									value: ['tmpfs', 'nsfs'],
								},
							],
						},
						groupBy: ['device', 'direction'],
						aggregateOperator: 17,
						expression: 'a',
					},
				},
			},
		});

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};
