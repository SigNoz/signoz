import { useMemo } from 'react';
import { Ellipsis, PenLine, Trash2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';

import styles from './RoutingPolicies.module.scss';
import { RoutingPolicy } from './types';

interface RoutingPolicyActionsMenuProps {
	routingPolicy: RoutingPolicy;
	onEdit: (routingPolicy: RoutingPolicy) => void;
	onDelete: (routingPolicy: RoutingPolicy) => void;
}

function RoutingPolicyActionsMenu({
	routingPolicy,
	onEdit,
	onDelete,
}: RoutingPolicyActionsMenuProps): JSX.Element {
	const menuItems = useMemo<DropdownItemType[]>(
		() => [
			{
				type: 'item',
				value: 'edit',
				label: 'Edit',
				prefix: <PenLine size={14} />,
				onClick: (): void => onEdit(routingPolicy),
			},
			{ type: 'separator', value: 'before-delete' },
			{
				type: 'item',
				value: 'delete',
				label: 'Delete',
				prefix: <Trash2 size={14} />,
				danger: true,
				onClick: (): void => onDelete(routingPolicy),
			},
		],
		[routingPolicy, onEdit, onDelete],
	);

	return (
		// the row itself opens the policy, so the actions keep their clicks
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
		<div
			className={styles.actions}
			onClick={(event): void => event.stopPropagation()}
		>
			<Dropdown items={menuItems} nativeButton align="end" side="bottom">
				<Button
					variant="outlined"
					color="secondary"
					size="sm"
					icon
					testId={`routing-policy-actions-${routingPolicy.id}`}
					aria-label={`Actions for ${routingPolicy.name}`}
				>
					<Ellipsis size={16} />
				</Button>
			</Dropdown>
		</div>
	);
}

export default RoutingPolicyActionsMenu;
