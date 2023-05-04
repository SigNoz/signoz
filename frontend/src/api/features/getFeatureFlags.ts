import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/features/getFeaturesFlags';

const getFeaturesFlags = async (): Promise<
	SuccessResponse<PayloadProps> | ErrorResponse
> => {
	try {
		const response = await axios.get(`/featureFlags`);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: [
				{
					name: 'DurationSort',
					active: true,
					usage: 0,
					usage_limit: -1,
					route: '',
				},
				{
					name: 'TimestampSort',
					active: true,
					usage: 0,
					usage_limit: -1,
					route: '',
				},
				{
					name: 'SMART_TRACE_DETAIL',
					active: false,
					usage: 0,
					usage_limit: -1,
					route: '',
				},
				{
					name: 'CUSTOM_METRICS_FUNCTION',
					active: false,
					usage: 0,
					usage_limit: -1,
					route: '',
				},
				{
					name: 'QUERY_BUILDER_PANELS',
					active: true,
					usage: 5,
					usage_limit: 1,
					route: '',
				},
				{
					name: 'QUERY_BUILDER_ALERTS',
					active: true,
					usage: 0,
					usage_limit: 5,
					route: '',
				},
				{
					name: 'DISABLE_UPSELL',
					active: false,
					usage: 0,
					usage_limit: -1,
					route: '',
				},
			],
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getFeaturesFlags;
