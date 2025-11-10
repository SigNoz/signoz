import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorResponseV2, ErrorV2Resp, SuccessResponseV2 } from 'types/api';

export interface UpdateRoutingPolicyBody {
	name: string;
	expression: string;
	channels: string[];
	description: string;
}

export interface UpdateRoutingPolicyResponse {
	success: boolean;
	message: string;
}

const updateRoutingPolicy = async (
	id: string,
	props: UpdateRoutingPolicyBody,
): Promise<
	SuccessResponseV2<UpdateRoutingPolicyResponse> | ErrorResponseV2
> => {
	try {
		const response = await axios.put(`/route_policies/${id}`, {
			...props,
		});

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		return ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default updateRoutingPolicy;
