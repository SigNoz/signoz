import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/channels/createWebhook';

const create = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		var http_config = {};
		
		if (props.username !== '' && props.password !== '')  {
			http_config = 		{
				basic_auth: {
					username: props.username,
					password: props.password,					
				},
			}; 
		} else if (props.username == '' && props.password !== '') {
			http_config = 		{
				authorization: {
					type: 'bearer',
					credentials: props.password,
				},
			}; 
		}

		const response = await axios.post('/channels', {
			name: props.name,
			webhook_configs: [
				{
					send_resolved: true,
					url: props.api_url,
					http_config: http_config,
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
