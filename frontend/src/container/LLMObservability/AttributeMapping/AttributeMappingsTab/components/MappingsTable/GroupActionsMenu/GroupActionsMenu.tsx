import { useMemo } from 'react';
import { EllipsisVertical, Pencil, Trash2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DropdownMenuSimple, type MenuItem } from '@signozhq/ui/dropdown-menu';

import type { DraftGroup } from 'container/LLMObservability/AttributeMapping/types';

interface GroupActionsMenuProps {
	group: DraftGroup;
	onEdit: (group: DraftGroup) => void;
	onRemove: (localId: string) => void;
}

function GroupActionsMenu({
	group,
	onEdit,
	onRemove,
}: GroupActionsMenuProps): JSX.Element {
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
				data-testid={`group-actions-${group.localId}`}
			>
				<EllipsisVertical size={16} />
			</Button>
		</DropdownMenuSimple>
	);
}

export default GroupActionsMenu;
