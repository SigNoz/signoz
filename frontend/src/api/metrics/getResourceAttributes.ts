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

export const getResourceAttributesTagKeys = async (
	props: TagKeyProps,
): Promise<SuccessResponse<TagKeysPayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.get(
			`/metrics/autocomplete/tagKey?metricName=${props.metricName}${
				props.match ? `&match=${props.match}` : ''
			}`,
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
			`/metrics/autocomplete/tagValue?metricName=${props.metricName}&tagKey=${props.tagKey}`,
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
