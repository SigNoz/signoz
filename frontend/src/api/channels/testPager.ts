import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Props } from 'types/api/channels/createPager';

const testPager = async (
	props: Props,
): Promise<SuccessResponseV2<PayloadProps>> => {
	try {
		const response = await axios.post<PayloadProps>('/testChannel', {
			name: props.name,
			pagerduty_configs: [
				{
					send_resolved: true,
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
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
		throw error;
	}
};

export default testPager;
