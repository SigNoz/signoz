import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/channels/editGoogleChat';

const editGoogleChatWebhook = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const httpConfig = {};

		const response = await axios.put(`/channels/${props.id}`, {
			name: props.name,
			googlechat_configs: [
				{
					send_resolved: props.send_resolved,
					url: props.api_url,
					http_config: httpConfig,
				},
			],
		});

		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default editGoogleChatWebhook;
