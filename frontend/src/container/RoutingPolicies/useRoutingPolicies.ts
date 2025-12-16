import './styles.scss';

import { toast } from '@signozhq/sonner';
import getAllChannels from 'api/channels/getAll';
import { GetRoutingPoliciesResponse } from 'api/routingPolicies/getRoutingPolicies';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useCreateRoutingPolicy } from 'hooks/routingPolicies/useCreateRoutingPolicy';
import { useDeleteRoutingPolicy } from 'hooks/routingPolicies/useDeleteRoutingPolicy';
import { useGetRoutingPolicies } from 'hooks/routingPolicies/useGetRoutingPolicies';
import { useUpdateRoutingPolicy } from 'hooks/routingPolicies/useUpdateRoutingPolicy';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import useUrlQuery from 'hooks/useUrlQuery';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useHistory } from 'react-router-dom';
import { SuccessResponseV2 } from 'types/api';
import { Channels } from 'types/api/channels/getAll';
import APIError from 'types/api/error';

import {
	PolicyDetailsModalMode,
	PolicyDetailsModalState,
	RoutingPolicy,
	UseRoutingPoliciesReturn,
} from './types';
import {
	mapApiResponseToRoutingPolicies,
	mapRoutingPolicyToCreateApiPayload,
	mapRoutingPolicyToUpdateApiPayload,
} from './utils';

function useRoutingPolicies(): UseRoutingPoliciesReturn {
	const queryClient = useQueryClient();
	const urlQuery = useUrlQuery();
	const history = useHistory();

	// Local state
	const [searchTerm, setSearchTerm] = useState(urlQuery.get('search') || '');
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [
		policyDetailsModalState,
		setPolicyDetailsModalState,
	] = useState<PolicyDetailsModalState>({
		mode: null,
		isOpen: false,
	});
	const [
		selectedRoutingPolicy,
		setSelectedRoutingPolicy,
	] = useState<RoutingPolicy | null>(null);

	const updateUrlWithSearch = useDebouncedFn((value) => {
		const searchValue = value as string;
		if (searchValue) {
			urlQuery.set('search', searchValue);
		} else {
			urlQuery.delete('search');
		}
		const url = `/alerts?${urlQuery.toString()}`;
		history.replace(url);
	}, 300);

	const handleSearch = (value: string): void => {
		setSearchTerm(value);
		updateUrlWithSearch(value);
	};

	// Routing Policies list
	const {
		data: routingPolicies,
		refetch: refetchRoutingPolicies,
		isFetching: isFetchingRoutingPolicies,
		isLoading: isLoadingRoutingPolicies,
		isError: isErrorRoutingPolicies,
	} = useGetRoutingPolicies();

	const routingPoliciesData = useMemo(() => {
		const unfilteredRoutingPolicies = mapApiResponseToRoutingPolicies(
			routingPolicies as SuccessResponseV2<GetRoutingPoliciesResponse>,
		);
		return unfilteredRoutingPolicies.filter(
			(routingPolicy) =>
				routingPolicy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				routingPolicy.description?.toLowerCase().includes(searchTerm.toLowerCase()),
		);
	}, [routingPolicies, searchTerm]);

	// Channels list
	const {
		data,
		isLoading: isLoadingChannels,
		isError: isErrorChannels,
		refetch: refetchChannels,
	} = useQuery<SuccessResponseV2<Channels[]>, APIError>(['getChannels'], {
		queryFn: () => getAllChannels(),
	});
	const channels = data?.data || [];

	const refreshChannels = (): void => {
		refetchChannels();
	};

	// Handlers
	const handlePolicyDetailsModalOpen = (
		mode: PolicyDetailsModalMode,
		routingPolicy: RoutingPolicy | null,
	): void => {
		if (routingPolicy) {
			setSelectedRoutingPolicy(routingPolicy);
		}
		setPolicyDetailsModalState({
			isOpen: true,
			mode,
		});
	};

	const handlePolicyDetailsModalClose = (): void => {
		setSelectedRoutingPolicy(null);
		setPolicyDetailsModalState({
			isOpen: false,
			mode: null,
		});
	};

	const handleDeleteModalOpen = (routingPolicy: RoutingPolicy): void => {
		setSelectedRoutingPolicy(routingPolicy);
		setIsDeleteModalOpen(true);
	};

	const handleDeleteModalClose = (): void => {
		setSelectedRoutingPolicy(null);
		setIsDeleteModalOpen(false);
	};

	// Create Routing Policy
	const {
		mutate: createRoutingPolicy,
		isLoading: isCreating,
	} = useCreateRoutingPolicy();

	// Update Routing Policy
	const {
		mutate: updateRoutingPolicy,
		isLoading: isUpdating,
	} = useUpdateRoutingPolicy();

	// Policy Details Modal Action (Create or Update)
	const handlePolicyDetailsModalAction = (
		mode: PolicyDetailsModalMode,
		routingPolicyData: {
			name: string;
			expression: string;
			channels: string[];
			description: string;
		},
	): void => {
		if (mode === 'create') {
			createRoutingPolicy(
				{
					payload: mapRoutingPolicyToCreateApiPayload(
						routingPolicyData.name,
						routingPolicyData.expression,
						routingPolicyData.channels,
						routingPolicyData.description,
					),
				},
				{
					onSuccess: () => {
						toast.success('Routing policy created successfully');
						queryClient.invalidateQueries(REACT_QUERY_KEY.GET_ROUTING_POLICIES);
						handlePolicyDetailsModalClose();
					},
					onError: (error) => {
						toast.error(`Error: ${error.message}`);
					},
				},
			);
		} else if (mode === 'edit' && selectedRoutingPolicy) {
			updateRoutingPolicy(
				{
					id: selectedRoutingPolicy.id,
					payload: mapRoutingPolicyToUpdateApiPayload(
						routingPolicyData.name,
						routingPolicyData.expression,
						routingPolicyData.channels,
						routingPolicyData.description,
					),
				},
				{
					onSuccess: () => {
						toast.success('Routing policy updated successfully');
						queryClient.invalidateQueries(REACT_QUERY_KEY.GET_ROUTING_POLICIES);
						handlePolicyDetailsModalClose();
					},
					onError: () => {
						toast.error('Failed to update routing policy');
					},
				},
			);
		}
	};

	// Policy Details Modal Action Loading (Creating or Updating)
	const isPolicyDetailsModalActionLoading = useMemo(() => {
		if (policyDetailsModalState.mode === 'create') {
			return isCreating;
		}
		if (policyDetailsModalState.mode === 'edit') {
			return isUpdating;
		}
		return false;
	}, [policyDetailsModalState.mode, isCreating, isUpdating]);

	// Delete Routing Policy
	const {
		mutate: deleteRoutingPolicy,
		isLoading: isDeletingRoutingPolicy,
	} = useDeleteRoutingPolicy();

	const handleDeleteRoutingPolicy = (): void => {
		if (!selectedRoutingPolicy) {
			return;
		}
		deleteRoutingPolicy(selectedRoutingPolicy.id, {
			onSuccess: () => {
				toast.success('Routing policy deleted successfully');
				queryClient.invalidateQueries(REACT_QUERY_KEY.GET_ROUTING_POLICIES);
				handleDeleteModalClose();
			},
			onError: () => {
				toast.error('Failed to delete routing policy');
			},
		});
	};

	return {
		// Routing Policies
		selectedRoutingPolicy,
		routingPoliciesData,
		isLoadingRoutingPolicies,
		isFetchingRoutingPolicies,
		isErrorRoutingPolicies,
		refetchRoutingPolicies,
		// Channels
		channels,
		isLoadingChannels,
		isErrorChannels,
		refreshChannels,
		// Search
		searchTerm,
		setSearchTerm: handleSearch,
		// Delete Modal
		isDeleteModalOpen,
		handleDeleteModalOpen,
		handleDeleteModalClose,
		handleDeleteRoutingPolicy,
		isDeletingRoutingPolicy,
		// Policy Details Modal
		policyDetailsModalState,
		isPolicyDetailsModalActionLoading,
		handlePolicyDetailsModalAction,
		handlePolicyDetailsModalOpen,
		handlePolicyDetailsModalClose,
	};
}

export default useRoutingPolicies;
