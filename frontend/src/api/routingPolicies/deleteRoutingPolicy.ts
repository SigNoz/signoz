import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';

// TODO: Add the correct interface
export interface DeleteRoutingPolicyResponse {
	success: boolean;
	message: string;
}

const deleteRoutingPolicy = async (
	routingPolicyId: string,
): Promise<SuccessResponse<DeleteRoutingPolicyResponse> | ErrorResponse> => {
	// TODO: Add the correct endpoint
	const response = await axios.delete(`/routing-policies/${routingPolicyId}`);

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};

export default deleteRoutingPolicy;
