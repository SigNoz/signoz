import { useMemo } from 'react';
import { Check } from '@signozhq/icons';
import AuthZDropdown from 'lib/authz/components/AuthZDropdown/AuthZDropdown';
import type { AuthZDropdownItemType } from 'lib/authz/components/AuthZDropdown/types';
import {
	buildSavedViewUpdatePermission,
	SavedViewCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/saved-view.permissions';

import SavedViewsIconButton from './SavedViewsIconButton';
import { SaveChangesMenuProps } from './types';

function SaveChangesMenu({
	viewId,
	disabled,
	onSaveAsNew,
	onUpdate,
}: SaveChangesMenuProps): JSX.Element {
	const items = useMemo<AuthZDropdownItemType[]>(
		() => [
			{
				type: 'item',
				value: 'save-as-new',
				label: 'Save as new view',
				checks: [SavedViewCreatePermission],
				onClick: onSaveAsNew,
			},
			{
				type: 'item',
				value: 'update',
				label: 'Update selected view',
				checks: [buildSavedViewUpdatePermission(viewId)],
				onClick: onUpdate,
			},
		],
		[viewId, onSaveAsNew, onUpdate],
	);

	return (
		<AuthZDropdown
			items={items}
			nativeButton
			align="end"
			side="bottom"
			disabled={disabled}
			disabledTooltip="Saving the view"
			testId="saved-views-save-changes"
		>
			<SavedViewsIconButton
				title="Save changes"
				icon={<Check size={14} />}
				color="warning"
				testId="saved-views-save-changes"
			/>
		</AuthZDropdown>
	);
}

export default SaveChangesMenu;
