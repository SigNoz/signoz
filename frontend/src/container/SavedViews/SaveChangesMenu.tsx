import { useMemo } from 'react';
import { Check } from '@signozhq/icons';
import { DropdownMenuSimple, type MenuItem } from '@signozhq/ui/dropdown-menu';

import SavedViewsIconButton from './SavedViewsIconButton';
import { SaveChangesMenuProps } from './types';

function SaveChangesMenu({
	disabled,
	onSaveAsNew,
	onUpdate,
}: SaveChangesMenuProps): JSX.Element {
	const items = useMemo<MenuItem[]>(
		() => [
			{ key: 'save-as-new', label: 'Save as new view', onClick: onSaveAsNew },
			{ key: 'update', label: 'Update selected view', onClick: onUpdate },
		],
		[onSaveAsNew, onUpdate],
	);

	return (
		<DropdownMenuSimple menu={{ items }} align="end">
			<SavedViewsIconButton
				title="Save changes"
				icon={<Check size={14} />}
				color="warning"
				disabled={disabled}
				testId="saved-views-save-changes"
			/>
		</DropdownMenuSimple>
	);
}

export default SaveChangesMenu;
