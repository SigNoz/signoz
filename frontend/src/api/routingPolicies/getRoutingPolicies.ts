import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';

// TODO: Add the correct interface
export interface ApiRoutingPolicy {
	id: string;
	name: string;
	expression: string;
	channels: string[];
	createdAt: string;
	updatedAt: string;
	createdBy: string;
	updatedBy: string;
}

// TODO: Add the correct interface
export interface GetRoutingPoliciesResponse {
	status: string;
	data?: {
		routingPolicies?: ApiRoutingPolicy[];
		total?: number;
	};
}

export const getRoutingPolicies = async (
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<GetRoutingPoliciesResponse> | ErrorResponse> => {
	try {
		// TODO: Add the correct endpoint
		const response = await axios.get('/routing-policies', {
			signal,
			headers,
		});

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};
