import { CreateRoutingPolicyBody } from 'api/routingPolicies/createRoutingPolicy';
import { GetRoutingPoliciesResponse } from 'api/routingPolicies/getRoutingPolicies';
import { UpdateRoutingPolicyBody } from 'api/routingPolicies/updateRoutingPolicy';
import { ErrorResponse, SuccessResponse } from 'types/api';

import { INITIAL_CREATE_ROUTING_POLICY_STATE } from './constants';
import {
	CreateRoutingPolicyAction,
	CreateRoutingPolicyState,
	RoutingPolicy,
} from './types';

export function showRoutingPoliciesPage(): boolean {
	return localStorage.getItem('showRoutingPoliciesPage') === 'true';
}

export function createRoutingPolicyReducer(
	state: CreateRoutingPolicyState,
	action: CreateRoutingPolicyAction,
): CreateRoutingPolicyState {
	switch (action.type) {
		case 'SET_NAME':
			return { ...state, name: action.payload };
		case 'SET_EXPRESSION':
			return { ...state, expression: action.payload };
		case 'SET_CHANNELS':
			return { ...state, channels: action.payload };
		case 'RESET':
			return INITIAL_CREATE_ROUTING_POLICY_STATE;
		default:
			return state;
	}
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
	userEmail: string,
): CreateRoutingPolicyBody {
	return {
		name,
		expression,
		channels,
		createdBy: userEmail,
	};
}

export function mapRoutingPolicyToUpdateApiPayload(
	name: string,
	expression: string,
	channels: string[],
	userEmail: string,
): UpdateRoutingPolicyBody {
	return {
		name,
		expression,
		channels,
		updatedBy: userEmail,
	};
}
