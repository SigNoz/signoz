import { ChangeEvent } from 'react';
import { Channels } from 'types/api/channels/getAll';

export interface RoutingPolicy {
	id: string;
	name: string;
	expression: string;
	channels: string[];
	createdAt: string | undefined;
	updatedAt: string | undefined;
	createdBy: string | undefined;
	updatedBy: string | undefined;
}

export type PolicyDetailsModalMode = 'create' | 'edit' | null;

export interface RoutingPolicyListProps {
	routingPolicies: RoutingPolicy[];
	isRoutingPoliciesLoading: boolean;
	isRoutingPoliciesError: boolean;
	handlePolicyDetailsModalOpen: (
		mode: PolicyDetailsModalMode,
		routingPolicy: RoutingPolicy,
	) => void;
	handleDeleteModalOpen: (routingPolicy: RoutingPolicy) => void;
}

export interface RoutingPolicyListItemProps {
	routingPolicy: RoutingPolicy;
	handlePolicyDetailsModalOpen: (
		mode: PolicyDetailsModalMode,
		routingPolicy: RoutingPolicy,
	) => void;
	handleDeleteModalOpen: (routingPolicy: RoutingPolicy) => void;
}

export interface PolicyListItemHeaderProps {
	name: string;
	handleEdit: () => void;
	handleDelete: () => void;
}

export interface PolicyListItemContentProps {
	routingPolicy: RoutingPolicy;
}

export interface CreateRoutingPolicyProps {
	routingPolicy: RoutingPolicy | null;
	closeModal: () => void;
	mode: PolicyDetailsModalMode;
	channels: Channels[];
	handlePolicyDetailsModalAction: (
		mode: PolicyDetailsModalMode,
		routingPolicyData: {
			name: string;
			expression: string;
			channels: string[];
			userEmail: string;
		},
	) => void;
	isPolicyDetailsModalActionLoading: boolean;
}

export interface DeleteRoutingPolicyProps {
	routingPolicy: RoutingPolicy | null;
	isDeletingRoutingPolicy: boolean;
	handleDelete: () => void;
	handleClose: () => void;
}

export interface UseRoutingPoliciesReturn {
	// Routing Policies
	selectedRoutingPolicy: RoutingPolicy | null;
	routingPoliciesData: RoutingPolicy[];
	isLoadingRoutingPolicies: boolean;
	isErrorRoutingPolicies: boolean;
	// Channels
	channels: Channels[];
	isLoadingChannels: boolean;
	// Search
	searchTerm: string;
	handleSearch: (e: ChangeEvent<HTMLInputElement>) => void;
	// Delete Modal
	isDeleteModalOpen: boolean;
	handleDeleteModalOpen: (routingPolicy: RoutingPolicy) => void;
	handleDeleteModalClose: () => void;
	handleDeleteRoutingPolicy: () => void;
	isDeletingRoutingPolicy: boolean;
	// Policy Details Modal
	policyDetailsModalState: PolicyDetailsModalState;
	handlePolicyDetailsModalClose: () => void;
	handlePolicyDetailsModalOpen: (mode: PolicyDetailsModalMode) => void;
	handlePolicyDetailsModalAction: (
		mode: PolicyDetailsModalMode,
		routingPolicyData: {
			name: string;
			expression: string;
			channels: string[];
			userEmail: string;
		},
	) => void;
	isPolicyDetailsModalActionLoading: boolean;
}

export interface PolicyDetailsModalState {
	mode: PolicyDetailsModalMode;
	isOpen: boolean;
}

export interface CreateRoutingPolicyState {
	name: string;
	expression: string;
	channels: string[];
}

export type CreateRoutingPolicyAction =
	| { type: 'SET_NAME'; payload: string }
	| { type: 'SET_EXPRESSION'; payload: string }
	| { type: 'SET_CHANNELS'; payload: string[] }
	| { type: 'RESET' };
