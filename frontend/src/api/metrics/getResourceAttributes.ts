import { ApiV2Instance as axios } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	TagKeysPayloadProps,
	TagValueProps,
	TagValuesPayloadProps,
} from 'types/api/metrics/getResourceAttributes';

export const getResourceAttributesTagKeys = async (): Promise<
	SuccessResponse<TagKeysPayloadProps> | ErrorResponse
> => {
	try {
		const response = await axios.get(
			'/metrics/autocomplete/tagKey?metricName=signoz_calls_total&match=resource_',
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
			`/metrics/autocomplete/tagValue?metricName=signoz_calls_total&tagKey=${props}`,
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
