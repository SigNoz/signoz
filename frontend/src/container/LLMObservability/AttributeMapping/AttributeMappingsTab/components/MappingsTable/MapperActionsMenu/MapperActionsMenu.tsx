import { useMemo } from 'react';
import { EllipsisVertical, Pencil, Trash2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';

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
	const menuItems = useMemo<DropdownItemType[]>(
		() => [
			{
				type: 'item',
				value: 'edit',
				label: 'Edit',
				prefix: <Pencil size={14} />,
				onClick: (): void => onEdit(mapper),
			},
			{
				type: 'item',
				value: 'delete',
				label: 'Delete',
				danger: true,
				prefix: <Trash2 size={14} />,
				onClick: (): void => onRemove(mapper.localId),
			},
		],
		[onEdit, onRemove, mapper],
	);

	return (
		<Dropdown items={menuItems} nativeButton align="end" side="bottom">
			<Button
				variant="ghost"
				color="secondary"
				size="sm"
				icon
				aria-label="Mapping actions"
				testId={`mapper-actions-${mapper.localId}`}
			>
				<EllipsisVertical size={16} />
			</Button>
		</Dropdown>
	);
}

export default MapperActionsMenu;
