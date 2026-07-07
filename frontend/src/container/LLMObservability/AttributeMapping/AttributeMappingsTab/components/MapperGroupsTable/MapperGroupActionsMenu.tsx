import { useMemo } from 'react';
import { EllipsisVertical, Pencil, Trash2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DropdownMenuSimple, type MenuItem } from '@signozhq/ui/dropdown-menu';

import type { DraftGroup } from '../../../types';

interface MapperGroupActionsMenuProps {
	group: DraftGroup;
	onEdit: (group: DraftGroup) => void;
	onRemove: (localId: string) => void;
}

// Per-row overflow menu for a mapping group. The enable/disable toggle stays
// inline in the row (it's the primary, high-frequency action); the lower-
// frequency Edit and Delete actions live behind the kebab to keep the row
// compact.
function MapperGroupActionsMenu({
	group,
	onEdit,
	onRemove,
}: MapperGroupActionsMenuProps): JSX.Element {
	const menuItems = useMemo<MenuItem[]>(
		() => [
			{
				key: 'edit',
				label: 'Edit',
				icon: <Pencil size={14} />,
				onClick: (): void => onEdit(group),
			},
			{
				key: 'delete',
				label: 'Delete',
				danger: true,
				icon: <Trash2 size={14} />,
				onClick: (): void => onRemove(group.localId),
			},
		],
		[onEdit, onRemove, group],
	);

	return (
		<DropdownMenuSimple menu={{ items: menuItems }} align="end">
			<Button
				variant="ghost"
				color="secondary"
				size="icon"
				aria-label="Group actions"
				testId={`group-actions-${group.localId}`}
			>
				<EllipsisVertical size={16} />
			</Button>
		</DropdownMenuSimple>
	);
}

export default MapperGroupActionsMenu;
