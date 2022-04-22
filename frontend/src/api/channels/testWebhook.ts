import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/channels/createWebhook';

const testWebhook = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		let httpConfig = {};

		if (props.username !== '' && props.password !== '') {
			httpConfig = {
				basic_auth: {
					username: props.username,
					password: props.password,
				},
			};
		} else if (props.username === '' && props.password !== '') {
			httpConfig = {
				authorization: {
					type: 'bearer',
					credentials: props.password,
				},
			};
		}

		const response = await axios.post('/testChannel', {
			name: props.name,
			webhook_configs: [
				{
					send_resolved: true,
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

export default testWebhook;
