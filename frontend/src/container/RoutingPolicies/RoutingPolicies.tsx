import { ChangeEvent, useCallback, useMemo } from 'react';
import { Plus, Search } from '@signozhq/icons';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import { ColumnSelector } from 'components/TanStackTableView';
import TextToolTip from 'components/TextToolTip';
import { Skeleton } from 'antd';
import {
	ROUTE_POLICY_CREATE_CHECKS,
	ROUTE_POLICY_LIST_CHECKS,
	useRoutePolicyCollectionPermissions,
} from 'hooks/routingPolicies/useRoutePolicyCollectionPermissions';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import { AuthZGuardContent } from 'lib/authz/components/AuthZGuard/AuthZGuardContent';
import PermissionDeniedCallout from 'lib/authz/components/PermissionDeniedCallout/PermissionDeniedCallout';
import { useTimezone } from 'providers/Timezone';

import DeleteRoutingPolicy from './DeleteRoutingPolicy';
import styles from './RoutingPolicies.module.scss';
import RoutingPolicyDetails from './RoutingPolicyDetails';
import RoutingPolicyList from './RoutingPolicyList';
import { getRoutingPolicyColumns } from './table.config';
import { RoutingPolicy } from './types';
import useRoutingPolicies from './useRoutingPolicies';
import useRoutingPoliciesTable from './useRoutingPoliciesTable';

import './styles.scss';

const COLUMNS_STORAGE_KEY = 'routing-policies-columns';

function RoutingPolicies(): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
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

	const { containerRef, calculatedPageSize, pagedPolicies, setPage, setLimit } =
		useRoutingPoliciesTable(routingPoliciesData);

	const { canList } = useRoutePolicyCollectionPermissions();

	const columns = useMemo(
		() => getRoutingPolicyColumns(formatTimezoneAdjustedTimestamp),
		[formatTimezoneAdjustedTimestamp],
	);

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		setSearchTerm(e.target.value || '');
		setPage(1);
	};

	const handleClearSearch = useCallback((): void => {
		setSearchTerm('');
		setPage(1);
	}, [setSearchTerm, setPage]);

	const handleCreate = useCallback(
		(): void => handlePolicyDetailsModalOpen('create', null),
		[handlePolicyDetailsModalOpen],
	);

	const handleEdit = useCallback(
		(routingPolicy: RoutingPolicy): void =>
			handlePolicyDetailsModalOpen('edit', routingPolicy),
		[handlePolicyDetailsModalOpen],
	);

	const isFetching = useMemo(
		() => isLoadingRoutingPolicies || isFetchingRoutingPolicies,
		[isLoadingRoutingPolicies, isFetchingRoutingPolicies],
	);
	const hasSearchTerm = useMemo(() => searchTerm.length > 0, [searchTerm]);
	const isEmpty = useMemo(
		() => !isFetching && !hasSearchTerm && routingPoliciesData.length === 0,
		[isFetching, hasSearchTerm, routingPoliciesData.length],
	);

	return (
		<div className={styles.container}>
			<header className={styles.headerBand}>
				<div className={styles.commandHeader}>
					<div className={styles.headingBlock}>
						<Typography.Title className={styles.title}>
							All routing policies
						</Typography.Title>
						<span className={styles.countPill}>{routingPoliciesData.length}</span>
					</div>
					<div className={styles.grow} />
					{!isEmpty && (
						<ColumnSelector
							columns={columns}
							storageKey={COLUMNS_STORAGE_KEY}
							testId="routing-policies-columns"
						/>
					)}
					<AuthZButton
						checks={ROUTE_POLICY_CREATE_CHECKS}
						variant="solid"
						color="primary"
						size="sm"
						prefix={<Plus size={14} />}
						onClick={handleCreate}
						testId="routing-policies-create"
					>
						New Routing Policy
					</AuthZButton>
					<TextToolTip
						text="More details on how to configure routing policies"
						url="https://signoz.io/docs/alerts-management/routing-policy"
						urlText="Learn More"
					/>
				</div>

				<div className={styles.filtersRow}>
					<Input
						containerClassName={styles.searchInput}
						placeholder="Search by name or description"
						value={searchTerm}
						onChange={handleSearch}
						disabled={!canList}
						suffix={<Search size={14} className={styles.searchIcon} />}
						testId="routing-policies-search"
					/>
				</div>
			</header>

			<div ref={containerRef} className={styles.tableContainer}>
				<AuthZGuardContent
					checks={ROUTE_POLICY_LIST_CHECKS}
					fallback={({ deniedPermissions }): JSX.Element => (
						<PermissionDeniedCallout
							deniedPermissions={deniedPermissions}
							className={styles.guardInset}
						/>
					)}
					fallbackOnLoading={
						<div className={styles.guardInset}>
							<Skeleton active paragraph={{ rows: 6 }} />
						</div>
					}
				>
					<RoutingPolicyList
						columns={columns}
						routingPolicies={routingPoliciesData}
						pagedPolicies={pagedPolicies}
						calculatedPageSize={calculatedPageSize}
						onLimitChange={setLimit}
						isFetching={isFetching}
						isError={isErrorRoutingPolicies}
						refetch={refetchRoutingPolicies}
						onEdit={handleEdit}
						onDelete={handleDeleteModalOpen}
						onCreate={handleCreate}
						hasSearchTerm={hasSearchTerm}
						onClearSearch={handleClearSearch}
					/>
				</AuthZGuardContent>
			</div>

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
	);
}

export default RoutingPolicies;
