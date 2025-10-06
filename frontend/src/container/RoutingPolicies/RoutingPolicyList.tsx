import { Table, TableProps, Typography } from 'antd';
import { useMemo } from 'react';

import RoutingPolicyListItem from './RoutingPolicyListItem';
import { RoutingPolicy, RoutingPolicyListProps } from './types';

function RoutingPolicyList({
	routingPolicies,
	isRoutingPoliciesLoading,
	isRoutingPoliciesError,
	handlePolicyDetailsModalOpen,
	handleDeleteModalOpen,
	hasSearchTerm,
}: RoutingPolicyListProps): JSX.Element {
	const columns: TableProps<RoutingPolicy>['columns'] = [
		{
			title: 'Routing Policy',
			key: 'routingPolicy',
			render: (data: RoutingPolicy): JSX.Element => (
				<RoutingPolicyListItem
					routingPolicy={data}
					handlePolicyDetailsModalOpen={handlePolicyDetailsModalOpen}
					handleDeleteModalOpen={handleDeleteModalOpen}
				/>
			),
		},
	];

	/* eslint-disable no-nested-ternary */
	const localeEmptyState = useMemo(
		() => (
			<div className="no-routing-policies-message-container">
				{isRoutingPoliciesError ? (
					<img src="/Icons/awwSnap.svg" alt="aww-snap" className="error-state-svg" />
				) : (
					<img
						src="/Icons/emptyState.svg"
						alt="thinking-emoji"
						className="empty-state-svg"
					/>
				)}
				{isRoutingPoliciesError ? (
					<Typography.Text>
						Something went wrong while fetching routing policies.
					</Typography.Text>
				) : hasSearchTerm ? (
					<Typography.Text>No matching routing policies found.</Typography.Text>
				) : (
					<Typography.Text>
						No routing policies yet,{' '}
						<a
							href="https://signoz.io/docs/alerts-management/routing-policy"
							target="_blank"
							rel="noopener noreferrer"
						>
							Learn more here
						</a>
					</Typography.Text>
				)}
			</div>
		),
		[isRoutingPoliciesError, hasSearchTerm],
	);

	return (
		<Table<RoutingPolicy>
			columns={columns}
			className="routing-policies-table"
			bordered={false}
			dataSource={routingPolicies}
			loading={isRoutingPoliciesLoading}
			showHeader={false}
			rowKey="id"
			pagination={{
				pageSize: 5,
				showSizeChanger: false,
				hideOnSinglePage: true,
			}}
			locale={{
				emptyText: isRoutingPoliciesLoading ? null : localeEmptyState,
			}}
		/>
	);
}

export default RoutingPolicyList;
