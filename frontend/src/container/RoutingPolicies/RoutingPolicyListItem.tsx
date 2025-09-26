import { Color } from '@signozhq/design-tokens';
import { Collapse, Flex, Tag, Typography } from 'antd';
import { PenLine, Trash2 } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
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
		<Flex className="policy-list-item-header" justify="space-between">
			<Typography>{name}</Typography>
			{isEditEnabled && (
				<div className="action-btn">
					<PenLine
						size={14}
						onClick={(e): void => {
							e.preventDefault();
							e.stopPropagation();
							handleEdit();
						}}
					/>
					<Trash2
						size={14}
						color={Color.BG_CHERRY_500}
						onClick={(e): void => {
							e.preventDefault();
							e.stopPropagation();
							handleDelete();
						}}
					/>
				</div>
			)}
		</Flex>
	);
}

function PolicyListItemContent({
	routingPolicy,
}: PolicyListItemContentProps): JSX.Element {
	return (
		<div className="policy-list-item-content">
			<div className="policy-list-item-content-row">
				<Typography>Created by</Typography>
				<Typography>{routingPolicy.createdBy}</Typography>
			</div>
			<div className="policy-list-item-content-row">
				<Typography>Created on</Typography>
				<Typography>{routingPolicy.createdAt}</Typography>
			</div>
			<div className="policy-list-item-content-row">
				<Typography>Updated on</Typography>
				<Typography>{routingPolicy.updatedAt}</Typography>
			</div>
			<div className="policy-list-item-content-row">
				<Typography>Updated by</Typography>
				<Typography>{routingPolicy.updatedBy}</Typography>
			</div>
			<div className="policy-list-item-content-row">
				<Typography>Channels</Typography>
				<div>
					{routingPolicy.channels.map((channel) => (
						<Tag key={channel}>{channel}</Tag>
					))}
				</div>
			</div>
			<div className="policy-list-item-content-row">
				<Typography>Expression</Typography>
				<Typography>{routingPolicy.expression}</Typography>
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
