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

/**
 * @deprecated Use the generated `useGetAllRoutePolicies` hook (or `getAllRoutePolicies` fetcher) from
 * `api/generated/services/routepolicies` instead. This hand-written client targets the
 * same endpoint and will be removed once call sites migrate.
 *
 * Part of https://github.com/SigNoz/engineering-pod/issues/5289, add a comment or update when removing this method.
 */
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
