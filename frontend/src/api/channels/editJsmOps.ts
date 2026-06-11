import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Props } from 'types/api/channels/editJsmOps';

const editJsmOps = async (
	props: Props,
): Promise<SuccessResponseV2<PayloadProps>> => {
	try {
		const response = await axios.put<PayloadProps>(`/channels/${props.id}`, {
			name: props.name,
			jsmops_configs: [
				{
					send_resolved: props.send_resolved,
					email: props.email,
					api_token: props.api_token,
					cloud_id: props.cloud_id,
					responders: props.responders
						? props.responders
								.split(',')
								.map((r: string) => r.trim())
								.filter((r: string) => r)
						: [],
					message: props.message,
					description: props.description,
					tags: props.tags
						? props.tags
								.split(',')
								.map((t: string) => t.trim())
								.filter((t: string) => t)
						: [],
					priority: props.priority,
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

export default editJsmOps;
