import type { AlertmanagertypesGettableRoutePolicyDTO } from 'api/generated/services/sigNoz.schemas';
import type { TableColumnDef } from 'components/TanStackTableView';
import type { ChannelOption } from 'hooks/notificationChannels/useChannelOptions';

export type RoutingPolicy = AlertmanagertypesGettableRoutePolicyDTO;

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
	columns: TableColumnDef<RoutingPolicy>[];
	routingPolicies: RoutingPolicy[];
	pagedPolicies: RoutingPolicy[];
	calculatedPageSize: number | null;
	onLimitChange: (limit: number) => void;
	isFetching: boolean;
	isError: boolean;
	refetch: () => void;
	canEdit: boolean;
	onEdit: (routingPolicy: RoutingPolicy) => void;
	onDelete: HandleDeleteModalOpen;
	onCreate: () => void;
	hasSearchTerm: boolean;
	onClearSearch: () => void;
}

export interface RoutingPolicyDetailsProps {
	routingPolicy: RoutingPolicy | null;
	closeModal: () => void;
	mode: PolicyDetailsModalMode;
	channels: ChannelOption[];
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
	channels: ChannelOption[];
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
