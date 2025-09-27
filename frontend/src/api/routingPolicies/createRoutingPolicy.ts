import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorResponseV2, ErrorV2Resp, SuccessResponseV2 } from 'types/api';

export interface CreateRoutingPolicyBody {
	name: string;
	expression: string;
	actions: {
		channels: string[];
	};
	description?: string;
}

export interface CreateRoutingPolicyResponse {
	success: boolean;
	message: string;
}

const createRoutingPolicy = async (
	props: CreateRoutingPolicyBody,
): Promise<
	SuccessResponseV2<CreateRoutingPolicyResponse> | ErrorResponseV2
> => {
	try {
		const response = await axios.post(`/notification-policy`, {
			...props,
			description: props.description || '',
			name: '',
		});
		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		return ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default createRoutingPolicy;
