import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';

// TODO: Add the correct interface
export interface CreateRoutingPolicyBody {
	name: string;
	expression: string;
	channels: string[];
	createdBy: string;
}

// TODO: Add the correct interface
export interface CreateRoutingPolicyResponse {
	success: boolean;
	message: string;
}

const createRoutingPolicy = async (
	props: CreateRoutingPolicyBody,
): Promise<SuccessResponse<CreateRoutingPolicyResponse> | ErrorResponse> => {
	// TODO: Add the correct endpoint
	const response = await axios.post(`/routing-policies`, {
		...props,
	});

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};

export default createRoutingPolicy;
