import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorResponseV2, ErrorV2Resp, SuccessResponseV2 } from 'types/api';

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
): Promise<SuccessResponseV2<GetRoutingPoliciesResponse> | ErrorResponseV2> => {
	try {
		const response = await axios.get('/route_policies', {
			signal,
			headers,
		});

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		return ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};
