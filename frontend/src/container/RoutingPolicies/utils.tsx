import { CreateRoutingPolicyBody } from 'api/routingPolicies/createRoutingPolicy';
import { GetRoutingPoliciesResponse } from 'api/routingPolicies/getRoutingPolicies';
import { UpdateRoutingPolicyBody } from 'api/routingPolicies/updateRoutingPolicy';
import { ErrorResponse, SuccessResponse } from 'types/api';

import { RoutingPolicy } from './types';

export function showRoutingPoliciesPage(): boolean {
	return localStorage.getItem('showRoutingPoliciesPage') === 'true';
}

export function mapApiResponseToRoutingPolicies(
	response:
		| SuccessResponse<GetRoutingPoliciesResponse, unknown>
		| ErrorResponse
		| undefined,
): RoutingPolicy[] {
	return (
		response?.payload?.data?.routingPolicies?.map((policyData) => ({
			id: policyData.id,
			name: policyData.name,
			expression: policyData.expression,
			channels: policyData.channels,
			createdAt: policyData.createdAt,
			updatedAt: policyData.updatedAt,
			createdBy: policyData.createdBy,
			updatedBy: policyData.updatedBy,
		})) || []
	);
}

export function mapRoutingPolicyToCreateApiPayload(
	name: string,
	expression: string,
	channels: string[],
): CreateRoutingPolicyBody {
	return {
		name,
		expression,
		channels,
	};
}

// eslint-disable-next-line sonarjs/no-identical-functions
export function mapRoutingPolicyToUpdateApiPayload(
	name: string,
	expression: string,
	channels: string[],
): UpdateRoutingPolicyBody {
	return {
		name,
		expression,
		channels,
	};
}
