import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Props } from 'types/api/channels/createWebhook';

const testWebhook = async (
	props: Props,
): Promise<SuccessResponseV2<PayloadProps>> => {
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

		const response = await axios.post<PayloadProps>('/testChannel', {
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
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
		throw error;
	}
};

export default testWebhook;
