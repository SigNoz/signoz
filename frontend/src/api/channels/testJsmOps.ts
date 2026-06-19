import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Props } from 'types/api/channels/createJsmOps';

const testJsmOps = async (
	props: Props & { id?: string },
): Promise<SuccessResponseV2<PayloadProps>> => {
	try {
		const response = await axios.post<PayloadProps>(
			'/testChannel',
			{
				name: props.name,
				jsmops_configs: [
					{
						send_resolved: true,
						connection_id: props.connection_id,
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
			},
			props.id ? { params: { channel_id: props.id } } : undefined,
		);

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
		throw error;
	}
};

export default testJsmOps;
