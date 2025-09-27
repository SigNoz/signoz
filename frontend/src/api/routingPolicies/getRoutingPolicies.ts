import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';

export interface ApiRoutingPolicy {
	id: string;
	name: string;
	expression: string;
	description: string;
	channels: string[];
	createdAt: string;
	updatedAt: string;
	createdBy: string;
	updatedBy: string;
}

export interface GetRoutingPoliciesResponse {
	status: string;
	data?: ApiRoutingPolicy[];
}

export const getRoutingPolicies = async (
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<GetRoutingPoliciesResponse> | ErrorResponse> => {
	try {
		const response = await axios.get('/notification-policy', {
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
