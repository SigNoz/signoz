import { useMemo } from 'react';
import { Check } from '@signozhq/icons';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';

import SavedViewsIconButton from './SavedViewsIconButton';
import { SaveChangesMenuProps } from './types';

function SaveChangesMenu({
	disabled,
	onSaveAsNew,
	onUpdate,
}: SaveChangesMenuProps): JSX.Element {
	const items = useMemo<DropdownItemType[]>(
		() => [
			{
				type: 'item',
				value: 'save-as-new',
				label: 'Save as new view',
				onClick: onSaveAsNew,
			},
			{
				type: 'item',
				value: 'update',
				label: 'Update selected view',
				onClick: onUpdate,
			},
		],
		[onSaveAsNew, onUpdate],
	);

	return (
		<Dropdown
			items={items}
			nativeButton
			align="end"
			side="bottom"
			disabled={disabled}
			disabledTooltip="Saving the view"
		>
			<SavedViewsIconButton
				title="Save changes"
				icon={<Check size={14} />}
				color="warning"
				testId="saved-views-save-changes"
			/>
		</Dropdown>
	);
}

export default SaveChangesMenu;
