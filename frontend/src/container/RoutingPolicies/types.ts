import { Channels } from 'types/api/channels/getAll';

export interface RoutingPolicy {
	id: string;
	name: string;
	expression: string;
	channels: string[];
	description: string | undefined;
	createdAt: string | undefined;
	updatedAt: string | undefined;
	createdBy: string | undefined;
	updatedBy: string | undefined;
}

type HandlePolicyDetailsModalOpen = (
	mode: PolicyDetailsModalMode,
	routingPolicy: RoutingPolicy | null,
) => void;

type HandlePolicyDetailsModalAction = (
	mode: PolicyDetailsModalMode,
	routingPolicyData: {
		name: string;
		expression: string;
		channels: string[];
		description: string;
	},
) => void;

type HandleDeleteModalOpen = (routingPolicy: RoutingPolicy) => void;

export type PolicyDetailsModalMode = 'create' | 'edit' | null;

export interface RoutingPolicyListProps {
	routingPolicies: RoutingPolicy[];
	refetchRoutingPolicies: () => void;
	isRoutingPoliciesLoading: boolean;
	isRoutingPoliciesFetching: boolean;
	isRoutingPoliciesError: boolean;
	handlePolicyDetailsModalOpen: HandlePolicyDetailsModalOpen;
	handleDeleteModalOpen: HandleDeleteModalOpen;
	hasSearchTerm: boolean;
}

export interface RoutingPolicyListItemProps {
	routingPolicy: RoutingPolicy;
	handlePolicyDetailsModalOpen: HandlePolicyDetailsModalOpen;
	handleDeleteModalOpen: HandleDeleteModalOpen;
}

export interface PolicyListItemHeaderProps {
	name: string;
	handleEdit: () => void;
	handleDelete: () => void;
}

export interface PolicyListItemContentProps {
	routingPolicy: RoutingPolicy;
}

export interface RoutingPolicyDetailsProps {
	routingPolicy: RoutingPolicy | null;
	closeModal: () => void;
	mode: PolicyDetailsModalMode;
	channels: Channels[];
	isErrorChannels: boolean;
	isLoadingChannels: boolean;
	handlePolicyDetailsModalAction: HandlePolicyDetailsModalAction;
	isPolicyDetailsModalActionLoading: boolean;
	refreshChannels: () => void;
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
	isFetchingRoutingPolicies: boolean;
	isErrorRoutingPolicies: boolean;
	refetchRoutingPolicies: () => void;
	// Channels
	channels: Channels[];
	isLoadingChannels: boolean;
	isErrorChannels: boolean;
	refreshChannels: () => void;
	// Search
	searchTerm: string;
	setSearchTerm: (searchTerm: string) => void;
	// Delete Modal
	isDeleteModalOpen: boolean;
	handleDeleteModalOpen: (routingPolicy: RoutingPolicy) => void;
	handleDeleteModalClose: () => void;
	handleDeleteRoutingPolicy: () => void;
	isDeletingRoutingPolicy: boolean;
	// Policy Details Modal
	policyDetailsModalState: PolicyDetailsModalState;
	handlePolicyDetailsModalClose: () => void;
	handlePolicyDetailsModalOpen: HandlePolicyDetailsModalOpen;
	handlePolicyDetailsModalAction: HandlePolicyDetailsModalAction;
	isPolicyDetailsModalActionLoading: boolean;
}

export interface PolicyDetailsModalState {
	mode: PolicyDetailsModalMode;
	isOpen: boolean;
}

export interface RoutingPolicyDetailsFormState {
	name: string;
	expression: string;
	channels: string[];
	description: string;
}
