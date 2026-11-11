import { useMemo } from 'react';
import { Ellipsis, PenLine, Trash2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import AuthZDropdown from 'lib/authz/components/AuthZDropdown/AuthZDropdown';
import type { AuthZDropdownItemType } from 'lib/authz/components/AuthZDropdown/types';
import {
	buildPlannedMaintenanceDeletePermission,
	buildPlannedMaintenanceReadPermission,
	buildPlannedMaintenanceUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/planned-maintenance.permissions';

import styles from './PlannedDowntime.module.scss';
import { DowntimeSchedulesTableData } from './types';

interface PlannedDowntimeActionsMenuProps {
	downtime: DowntimeSchedulesTableData;
	onEdit: (downtime: DowntimeSchedulesTableData) => void;
	onDelete: (downtime: DowntimeSchedulesTableData) => void;
}

function PlannedDowntimeActionsMenu({
	downtime,
	onEdit,
	onDelete,
}: PlannedDowntimeActionsMenuProps): JSX.Element {
	const menuItems = useMemo<AuthZDropdownItemType[]>(
		() => [
			{
				type: 'item',
				value: 'edit',
				label: 'Edit',
				testId: `downtime-edit-${downtime.id}`,
				prefix: <PenLine size={14} />,
				checks: [
					buildPlannedMaintenanceReadPermission(downtime.id),
					buildPlannedMaintenanceUpdatePermission(downtime.id),
				],
				onClick: (): void => onEdit(downtime),
			},
			{ type: 'separator', value: 'before-delete' },
			{
				type: 'item',
				value: 'delete',
				label: 'Delete',
				testId: `downtime-delete-${downtime.id}`,
				prefix: <Trash2 size={14} />,
				danger: true,
				checks: [buildPlannedMaintenanceDeletePermission(downtime.id)],
				onClick: (): void => onDelete(downtime),
			},
		],
		[downtime, onEdit, onDelete],
	);

	return (
		// the row itself opens the downtime, so the actions keep their clicks
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
					testId={`downtime-actions-${downtime.id}`}
					aria-label={`Actions for ${downtime.name}`}
				>
					<Ellipsis size={16} />
				</Button>
			</AuthZDropdown>
		</div>
	);
}

export default PlannedDowntimeActionsMenu;
