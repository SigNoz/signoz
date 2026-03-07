import { CreateRoutingPolicyBody } from 'api/routingPolicies/createRoutingPolicy';
import { GetRoutingPoliciesResponse } from 'api/routingPolicies/getRoutingPolicies';
import { UpdateRoutingPolicyBody } from 'api/routingPolicies/updateRoutingPolicy';
import { SuccessResponseV2 } from 'types/api';

import { RoutingPolicy } from './types';

export function mapApiResponseToRoutingPolicies(
	response: SuccessResponseV2<GetRoutingPoliciesResponse>,
): RoutingPolicy[] {
	return (
		response?.data?.data?.map((policyData) => ({
			id: policyData.id,
			name: policyData.name,
			expression: policyData.expression,
			description: policyData.description,
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
	description: string,
): CreateRoutingPolicyBody {
	return {
		name,
		expression,
		channels,
		description,
	};
}

// eslint-disable-next-line sonarjs/no-identical-functions
export function mapRoutingPolicyToUpdateApiPayload(
	name: string,
	expression: string,
	channels: string[],
	description: string,
): UpdateRoutingPolicyBody {
	return {
		name,
		expression,
		channels,
		description,
	};
}
