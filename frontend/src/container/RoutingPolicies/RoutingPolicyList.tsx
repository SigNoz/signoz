import { Button, Table, TableProps, Typography } from 'antd';
import { RotateCw } from 'lucide-react';
import { useMemo } from 'react';

import RoutingPolicyListItem from './RoutingPolicyListItem';
import { RoutingPolicy, RoutingPolicyListProps } from './types';

function RoutingPolicyList({
	routingPolicies,
	refetchRoutingPolicies,
	isRoutingPoliciesFetching,
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

	const showLoading = isRoutingPoliciesLoading || isRoutingPoliciesFetching;
	const showError = !showLoading && isRoutingPoliciesError;

	/* eslint-disable no-nested-ternary */
	const localeEmptyState = useMemo(
		() => (
			<div className="no-routing-policies-message-container">
				{showError ? (
					<img src="/Icons/awwSnap.svg" alt="aww-snap" className="error-state-svg" />
				) : (
					<img
						src="/Icons/emptyState.svg"
						alt="thinking-emoji"
						className="empty-state-svg"
					/>
				)}
				{showError ? (
					<div className="error-state">
						<Typography.Text>
							Something went wrong while fetching routing policies.
						</Typography.Text>
						<Button icon={<RotateCw size={14} />} onClick={refetchRoutingPolicies}>
							Retry
						</Button>
					</div>
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
		[showError, hasSearchTerm, refetchRoutingPolicies],
	);

	return (
		<Table<RoutingPolicy>
			columns={columns}
			className="routing-policies-table"
			bordered={false}
			dataSource={routingPolicies}
			loading={showLoading}
			showHeader={false}
			rowKey="id"
			pagination={{
				pageSize: 5,
				showSizeChanger: false,
				hideOnSinglePage: true,
			}}
			locale={{
				emptyText: showLoading ? null : localeEmptyState,
			}}
		/>
	);
}

export default RoutingPolicyList;
