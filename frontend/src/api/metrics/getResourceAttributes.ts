import { ApiV3Instance as axios } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import createQueryParams from 'lib/createQueryParams';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	TagKeyProps,
	TagKeysPayloadProps,
	TagValueProps,
	TagValuesPayloadProps,
} from 'types/api/metrics/getResourceAttributes';
import { DataSource, MetricAggregateOperator } from 'types/common/queryBuilder';

export const getResourceAttributesTagKeys = async (
	props: TagKeyProps,
): Promise<SuccessResponse<TagKeysPayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.get(
			`/autocomplete/attribute_keys?${createQueryParams({
				aggregateOperator: MetricAggregateOperator.RATE,
				searchText: props.match,
				dataSource: DataSource.METRICS,
				aggregateAttribute: props.metricName,
			})}`,
		);

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

export const getResourceAttributesTagValues = async (
	props: TagValueProps,
): Promise<SuccessResponse<TagValuesPayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.get(
			`/autocomplete/attribute_values?${createQueryParams({
				aggregateOperator: MetricAggregateOperator.RATE,
				dataSource: DataSource.METRICS,
				aggregateAttribute: props.metricName,
				attributeKey: props.tagKey,
				searchText: '',
			})}`,
		);

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
