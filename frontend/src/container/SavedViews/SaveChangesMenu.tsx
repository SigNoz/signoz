import { useMemo } from 'react';
import { Check } from '@signozhq/icons';
import { DropdownMenuSimple } from '@signozhq/ui/dropdown-menu';
import {
	buildSavedViewUpdatePermission,
	SavedViewCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/saved-view.permissions';
import { useSavedViewMenuItems } from './hooks/useSavedViewMenuItems';

import SavedViewsIconButton from './SavedViewsIconButton';
import { SaveChangesMenuProps, SavedViewMenuItem } from './types';

function SaveChangesMenu({
	viewId,
	disabled,
	onSaveAsNew,
	onUpdate,
}: SaveChangesMenuProps): JSX.Element {
	const actionItems = useMemo<SavedViewMenuItem[]>(
		() => [
			{
				key: 'save-as-new',
				label: <span data-testid="saved-views-save-as-new">Save as new view</span>,
				checks: [SavedViewCreatePermission],
				onClick: onSaveAsNew,
			},
			{
				key: 'update',
				label: <span data-testid="saved-views-update">Update selected view</span>,
				checks: [buildSavedViewUpdatePermission(viewId)],
				onClick: onUpdate,
			},
		],
		[viewId, onSaveAsNew, onUpdate],
	);
	const items = useSavedViewMenuItems(actionItems);

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
