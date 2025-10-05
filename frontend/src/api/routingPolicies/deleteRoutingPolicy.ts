import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorResponseV2, ErrorV2Resp, SuccessResponseV2 } from 'types/api';

export interface DeleteRoutingPolicyResponse {
	success: boolean;
	message: string;
}

const deleteRoutingPolicy = async (
	routingPolicyId: string,
): Promise<
	SuccessResponseV2<DeleteRoutingPolicyResponse> | ErrorResponseV2
> => {
	try {
		const response = await axios.delete(`/route_policies/${routingPolicyId}`);

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		return ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default deleteRoutingPolicy;
