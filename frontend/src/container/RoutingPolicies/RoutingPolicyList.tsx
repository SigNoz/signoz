import { useMemo } from 'react';
import ErrorEmptyState from 'components/Alerts/ErrorEmptyState';
import NoResultsEmptyState from 'components/Alerts/NoResultsEmptyState';
import TanStackTable, { TableColumnDef } from 'components/TanStackTableView';

import RoutingPoliciesEmptyState from './RoutingPoliciesEmptyState';
import RoutingPolicyActionsMenu from './RoutingPolicyActionsMenu';
import styles from './RoutingPolicies.module.scss';
import { RoutingPolicy, RoutingPolicyListProps } from './types';
import { ROUTING_POLICIES_QUERY_PARAMS } from './useRoutingPoliciesTable';

function RoutingPolicyList({
	columns,
	routingPolicies,
	pagedPolicies,
	calculatedPageSize,
	onLimitChange,
	isFetching,
	isError,
	refetch,
	canEdit,
	onEdit,
	onDelete,
	onCreate,
	hasSearchTerm,
	onClearSearch,
}: RoutingPolicyListProps): JSX.Element {
	const columnsWithActions = useMemo((): TableColumnDef<RoutingPolicy>[] => {
		if (!canEdit) {
			return columns;
		}

		return [
			...columns,
			{
				id: 'actions',
				header: (): JSX.Element => (
					<span className={styles.actionsHeader}>Actions</span>
				),
				accessorKey: 'id',
				width: { fixed: '96px', ignoreLastColumnFill: true },
				enableSort: false,
				enableResize: false,
				enableRemove: false,
				enableMove: false,
				pin: 'right',
				cell: ({ row }): JSX.Element => (
					<RoutingPolicyActionsMenu
						routingPolicy={row}
						onEdit={onEdit}
						onDelete={onDelete}
					/>
				),
			},
		];
	}, [canEdit, columns, onEdit, onDelete]);

	const isEmpty = !isFetching && routingPolicies.length === 0;

	if (isError) {
		return (
			<ErrorEmptyState
				title="Failed to load routing policies"
				onRefresh={refetch}
			/>
		);
	}

	if (isEmpty && hasSearchTerm) {
		return (
			<NoResultsEmptyState
				title="No matching routing policies"
				subtitle="No routing policies match your search. Try adjusting your search criteria."
				onClear={onClearSearch}
				clearButtonText="Clear Search"
			/>
		);
	}

	if (isEmpty) {
		return <RoutingPoliciesEmptyState canCreate={canEdit} onCreate={onCreate} />;
	}

	return (
		<TanStackTable<RoutingPolicy>
			data={pagedPolicies}
			columns={columnsWithActions}
			isLoading={isFetching}
			getRowKey={(row): string => row.id}
			getItemKey={(row): string => row.id}
			getRowTestId={(row): string => `routing-policy-row-${row.id}`}
			columnStorageKey="routing-policies-columns"
			enableQueryParams={ROUTING_POLICIES_QUERY_PARAMS}
			onRowClick={canEdit ? onEdit : undefined}
			pagination={{
				total: routingPolicies.length,
				calculatedPageSize,
				onLimitChange,
				showTotalCount: true,
			}}
			paginationClassname={styles.paginationContainer}
			enableAlternatingRowColors
			plainTextCellLineClamp={1}
		/>
	);
}

export default RoutingPolicyList;
