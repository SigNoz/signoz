import { ChangeEvent, useCallback, useMemo } from 'react';
import { Plus, Search } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import { ColumnSelector } from 'components/TanStackTableView';
import TextToolTip from 'components/TextToolTip';
import { useAppContext } from 'providers/App/App';
import { useTimezone } from 'providers/Timezone';
import { USER_ROLES } from 'types/roles';

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
	const { user } = useAppContext();
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

	const canEdit = user?.role !== USER_ROLES.VIEWER;

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
							Routing Policies
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
					<Button
						variant="solid"
						color="primary"
						size="sm"
						prefix={<Plus size={14} />}
						onClick={handleCreate}
						disabled={!canEdit}
						disabledTooltip="You need edit permissions to create a routing policy"
						testId="routing-policies-create"
					>
						New routing policy
					</Button>
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
						suffix={<Search size={14} className={styles.searchIcon} />}
						testId="routing-policies-search"
					/>
				</div>
			</header>

			<div ref={containerRef} className={styles.tableContainer}>
				<RoutingPolicyList
					columns={columns}
					routingPolicies={routingPoliciesData}
					pagedPolicies={pagedPolicies}
					calculatedPageSize={calculatedPageSize}
					onLimitChange={setLimit}
					isFetching={isFetching}
					isError={isErrorRoutingPolicies}
					refetch={refetchRoutingPolicies}
					canEdit={canEdit}
					onEdit={handleEdit}
					onDelete={handleDeleteModalOpen}
					onCreate={handleCreate}
					hasSearchTerm={hasSearchTerm}
					onClearSearch={handleClearSearch}
				/>
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
