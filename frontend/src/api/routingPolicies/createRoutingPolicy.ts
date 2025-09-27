import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';

// TODO: Add the correct interface
export interface CreateRoutingPolicyBody {
	name: string;
	expression: string;
	actions: {
		channels: string[];
	};
	description?: string;
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
	const response = await axios.post(`/notification-policy`, {
		...props,
		description: props.description || '',
	});

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};

export default createRoutingPolicy;
