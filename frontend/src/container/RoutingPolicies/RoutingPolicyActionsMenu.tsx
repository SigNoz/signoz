import { useMemo } from 'react';
import { Ellipsis, PenLine, Trash2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import AuthZDropdown from 'lib/authz/components/AuthZDropdown/AuthZDropdown';
import type { AuthZDropdownItemType } from 'lib/authz/components/AuthZDropdown/types';
import {
	buildRoutePolicyDeletePermission,
	buildRoutePolicyReadPermission,
	buildRoutePolicyUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/route-policy.permissions';

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
	const menuItems = useMemo<AuthZDropdownItemType[]>(
		() => [
			{
				type: 'item',
				value: 'edit',
				label: 'Edit',
				testId: `routing-policy-edit-${routingPolicy.id}`,
				prefix: <PenLine size={14} />,
				checks: [
					buildRoutePolicyReadPermission(routingPolicy.id),
					buildRoutePolicyUpdatePermission(routingPolicy.id),
				],
				onClick: (): void => onEdit(routingPolicy),
			},
			{ type: 'separator', value: 'before-delete' },
			{
				type: 'item',
				value: 'delete',
				label: 'Delete',
				testId: `routing-policy-delete-${routingPolicy.id}`,
				prefix: <Trash2 size={14} />,
				danger: true,
				checks: [buildRoutePolicyDeletePermission(routingPolicy.id)],
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
			<AuthZDropdown items={menuItems} nativeButton align="end" side="bottom">
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
			</AuthZDropdown>
		</div>
	);
}

export default RoutingPolicyActionsMenu;
