import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';

export interface UpdateRoutingPolicyBody {
	name: string;
	expression: string;
	actions: {
		channels: string[];
	};
	description: string;
}

export interface UpdateRoutingPolicyResponse {
	success: boolean;
	message: string;
}

const updateRoutingPolicy = async (
	id: string,
	props: UpdateRoutingPolicyBody,
): Promise<SuccessResponse<UpdateRoutingPolicyResponse> | ErrorResponse> => {
	// TODO: Add the correct endpoint
	const response = await axios.put(`/notification-policy/${id}`, {
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
