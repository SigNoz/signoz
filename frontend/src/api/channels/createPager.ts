import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/channels/createPager';

const create = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.post('/channels', {
			name: props.name,
			pagerduty_configs: [
				{
					send_resolved: props.send_resolved,
					routing_key: props.routing_key,
					client: props.client,
					client_url: props.client_url,
					description: props.description,
					severity: props.severity,
					class: props.class,
					component: props.component,
					group: props.group,
					details: {
						...props.detailsArray,
					},
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
