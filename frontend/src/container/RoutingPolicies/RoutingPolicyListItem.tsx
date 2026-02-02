import { Color } from '@signozhq/design-tokens';
import { Button, Collapse, Flex, Tag, Typography } from 'antd';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { PenLine, Trash2 } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useTimezone } from 'providers/Timezone';
import { USER_ROLES } from 'types/roles';

import {
	PolicyListItemContentProps,
	PolicyListItemHeaderProps,
	RoutingPolicyListItemProps,
} from './types';

function PolicyListItemHeader({
	name,
	handleEdit,
	handleDelete,
}: PolicyListItemHeaderProps): JSX.Element {
	const { user } = useAppContext();

	const isEditEnabled = user?.role !== USER_ROLES.VIEWER;

	return (
		<Flex
			className="policy-list-item-header"
			justify="space-between"
			align="center"
		>
			<Typography.Text
				className="policy-list-item-header-title"
				ellipsis={{ tooltip: name }}
			>
				{name}
			</Typography.Text>
			{isEditEnabled && (
				<div className="action-btn">
					<Button
						onClick={(e): void => {
							e.preventDefault();
							e.stopPropagation();
							handleEdit();
						}}
						type="text"
						shape="circle"
						icon={<PenLine size={14} data-testid="edit-routing-policy" />}
					/>
					<Button
						onClick={(e): void => {
							e.preventDefault();
							e.stopPropagation();
							handleDelete();
						}}
						type="text"
						shape="circle"
						icon={
							<Trash2
								size={14}
								color={Color.BG_CHERRY_500}
								data-testid="delete-routing-policy"
							/>
						}
					/>
				</div>
			)}
		</Flex>
	);
}

function PolicyListItemContent({
	routingPolicy,
}: PolicyListItemContentProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	return (
		<div className="policy-list-item-content">
			<div className="policy-list-item-content-row">
				<Typography>Created by</Typography>
				<Typography>{routingPolicy.createdBy}</Typography>
			</div>
			<div className="policy-list-item-content-row">
				<Typography>Created on</Typography>
				<Typography>
					{routingPolicy.createdAt
						? formatTimezoneAdjustedTimestamp(
								routingPolicy.createdAt,
								DATE_TIME_FORMATS.MONTH_DATETIME,
						  )
						: '-'}
				</Typography>
			</div>
			<div className="policy-list-item-content-row">
				<Typography>Updated by</Typography>
				<Typography>{routingPolicy.updatedBy || '-'}</Typography>
			</div>
			<div className="policy-list-item-content-row">
				<Typography>Updated on</Typography>
				<Typography>
					{routingPolicy.updatedAt
						? formatTimezoneAdjustedTimestamp(
								routingPolicy.updatedAt,
								DATE_TIME_FORMATS.MONTH_DATETIME,
						  )
						: '-'}
				</Typography>
			</div>
			<div className="policy-list-item-content-row">
				<Typography>Expression</Typography>
				<Typography.Text ellipsis={{ tooltip: routingPolicy.expression || '-' }}>
					{routingPolicy.expression || '-'}
				</Typography.Text>
			</div>
			<div className="policy-list-item-content-row">
				<Typography>Description</Typography>
				<Typography.Text ellipsis={{ tooltip: routingPolicy.description || '-' }}>
					{routingPolicy.description || '-'}
				</Typography.Text>
			</div>
			<div className="policy-list-item-content-row">
				<Typography>Channels</Typography>
				<div>
					{routingPolicy.channels.map((channel) => (
						<Tag key={channel}>{channel}</Tag>
					))}
				</div>
			</div>
		</div>
	);
}

function RoutingPolicyListItem({
	routingPolicy,
	handlePolicyDetailsModalOpen,
	handleDeleteModalOpen,
}: RoutingPolicyListItemProps): JSX.Element {
	return (
		<Collapse accordion className="policy-list-item">
			<Collapse.Panel
				header={
					<PolicyListItemHeader
						name={routingPolicy.name}
						handleEdit={(): void =>
							handlePolicyDetailsModalOpen('edit', routingPolicy)
						}
						handleDelete={(): void => handleDeleteModalOpen(routingPolicy)}
					/>
				}
				key={routingPolicy.id}
			>
				<PolicyListItemContent routingPolicy={routingPolicy} />
			</Collapse.Panel>
		</Collapse>
	);
}

export default RoutingPolicyListItem;
