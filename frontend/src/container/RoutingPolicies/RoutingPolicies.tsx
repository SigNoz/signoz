import './styles.scss';

import { PlusOutlined } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import { Button, Flex, Input, Tooltip, Typography } from 'antd';
import { Search } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { ChangeEvent, useMemo } from 'react';
import { USER_ROLES } from 'types/roles';

import DeleteRoutingPolicy from './DeleteRoutingPolicy';
import RoutingPolicyDetails from './RoutingPolicyDetails';
import RoutingPolicyList from './RoutingPolicyList';
import useRoutingPolicies from './useRoutingPolicies';

function RoutingPolicies(): JSX.Element {
	const { user } = useAppContext();
	const {
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
		setSearchTerm,
		// Delete Modal
		isDeleteModalOpen,
		handleDeleteModalOpen,
		handleDeleteModalClose,
		handleDeleteRoutingPolicy,
		isDeletingRoutingPolicy,
		// Policy Details Modal
		policyDetailsModalState,
		handlePolicyDetailsModalClose,
		handlePolicyDetailsModalOpen,
		handlePolicyDetailsModalAction,
		isPolicyDetailsModalActionLoading,
	} = useRoutingPolicies();

	const disableCreateButton = user?.role === USER_ROLES.VIEWER;

	const tooltipTitle = useMemo(() => {
		if (user?.role === USER_ROLES.VIEWER) {
			return 'You need edit permissions to create a routing policy';
		}
		return '';
	}, [user?.role]);

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		setSearchTerm(e.target.value || '');
	};

	return (
		<div className="routing-policies-container">
			<div className="routing-policies-content">
				<Typography.Title className="title">Routing Policies</Typography.Title>
				<Typography.Text className="subtitle">
					Create and manage routing policies.
				</Typography.Text>
				<Flex className="toolbar">
					<Input
						placeholder="Search for a routing policy..."
						prefix={<Search size={12} color={Color.BG_VANILLA_400} />}
						value={searchTerm}
						onChange={handleSearch}
					/>
					<Tooltip title={tooltipTitle}>
						<Button
							icon={<PlusOutlined />}
							type="primary"
							onClick={(): void => handlePolicyDetailsModalOpen('create', null)}
							disabled={disableCreateButton}
						>
							New routing policy
						</Button>
					</Tooltip>
				</Flex>
				<br />
				<RoutingPolicyList
					routingPolicies={routingPoliciesData}
					refetchRoutingPolicies={refetchRoutingPolicies}
					isRoutingPoliciesFetching={isFetchingRoutingPolicies}
					isRoutingPoliciesLoading={isLoadingRoutingPolicies}
					isRoutingPoliciesError={isErrorRoutingPolicies}
					handlePolicyDetailsModalOpen={handlePolicyDetailsModalOpen}
					handleDeleteModalOpen={handleDeleteModalOpen}
					hasSearchTerm={(searchTerm?.length ?? 0) > 0}
				/>
				{policyDetailsModalState.isOpen && (
					<RoutingPolicyDetails
						routingPolicy={selectedRoutingPolicy}
						closeModal={handlePolicyDetailsModalClose}
						mode={policyDetailsModalState.mode}
						channels={channels}
						isErrorChannels={isErrorChannels}
						isLoadingChannels={isLoadingChannels}
						handlePolicyDetailsModalAction={handlePolicyDetailsModalAction}
						isPolicyDetailsModalActionLoading={isPolicyDetailsModalActionLoading}
						refreshChannels={refreshChannels}
					/>
				)}
				{isDeleteModalOpen && (
					<DeleteRoutingPolicy
						isDeletingRoutingPolicy={isDeletingRoutingPolicy}
						handleDelete={handleDeleteRoutingPolicy}
						handleClose={handleDeleteModalClose}
						routingPolicy={selectedRoutingPolicy}
					/>
				)}
			</div>
		</div>
	);
}

export default RoutingPolicies;
