import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/channels/createWebhook';

const create = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		let httpConfig = {};
		const username = props.username ? props.username.trim() : '';
		const password = props.password ? props.password.trim() : '';

		if (username !== '' && password !== '') {
			httpConfig = {
				basic_auth: {
					username,
					password,
				},
			};
		} else if (username === '' && password !== '') {
			httpConfig = {
				authorization: {
					type: 'Bearer',
					credentials: password,
				},
			};
		}

		const response = await axios.post('/channels', {
			name: props.name,
			webhook_configs: [
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

export default create;
