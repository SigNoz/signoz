import { useMemo } from 'react';
import { EllipsisVertical, Pencil, Trash2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DropdownMenuSimple, type MenuItem } from '@signozhq/ui/dropdown-menu';

import type { DraftMapper } from 'container/LLMObservability/AttributeMapping/types';

interface MapperActionsMenuProps {
	mapper: DraftMapper;
	onEdit: (mapper: DraftMapper) => void;
	onRemove: (localId: string) => void;
}

function MapperActionsMenu({
	mapper,
	onEdit,
	onRemove,
}: MapperActionsMenuProps): JSX.Element {
	const menuItems = useMemo<MenuItem[]>(
		() => [
			{
				key: 'edit',
				label: 'Edit',
				icon: <Pencil size={14} />,
				onClick: (): void => onEdit(mapper),
			},
			{
				key: 'delete',
				label: 'Delete',
				danger: true,
				icon: <Trash2 size={14} />,
				onClick: (): void => onRemove(mapper.localId),
			},
		],
		[onEdit, onRemove, mapper],
	);

	return (
		<DropdownMenuSimple menu={{ items: menuItems }} align="end">
			<Button
				variant="ghost"
				color="secondary"
				size="icon"
				aria-label="Mapping actions"
				testId={`mapper-actions-${mapper.localId}`}
			>
				<EllipsisVertical size={16} />
			</Button>
		</DropdownMenuSimple>
	);
}

export default MapperActionsMenu;
