import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';

// TODO: Add the correct interface
export interface UpdateRoutingPolicyBody {
	name: string;
	expression: string;
	channels: string[];
}

// TODO: Add the correct interface
export interface UpdateRoutingPolicyResponse {
	success: boolean;
	message: string;
}

const updateRoutingPolicy = async (
	id: string,
	props: UpdateRoutingPolicyBody,
): Promise<SuccessResponse<UpdateRoutingPolicyResponse> | ErrorResponse> => {
	// TODO: Add the correct endpoint
	const response = await axios.put(`/routing-policies/${id}`, {
		...props,
	});

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};

export default updateRoutingPolicy;
