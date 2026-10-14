import { useMemo } from 'react';
import { Check } from '@signozhq/icons';
import { DropdownMenuSimple, type MenuItem } from '@signozhq/ui/dropdown-menu';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import {
	buildSavedViewUpdatePermission,
	SavedViewCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/saved-view.permissions';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

import SavedViewsIconButton from './SavedViewsIconButton';
import { SaveChangesMenuProps } from './types';

import styles from './SavedViewsMenu.module.scss';

function SaveChangesMenu({
	viewId,
	disabled,
	onSaveAsNew,
	onUpdate,
}: SaveChangesMenuProps): JSX.Element {
	const updatePermission = buildSavedViewUpdatePermission(viewId);
	const { isLoading, deniedPermissions } = useAuthZ([
		SavedViewCreatePermission,
		updatePermission,
	]);

	const items = useMemo<MenuItem[]>(() => {
		const isCreateDisabled =
			isLoading || deniedPermissions.includes(SavedViewCreatePermission);
		const isUpdateDisabled =
			isLoading || deniedPermissions.includes(updatePermission);
		return [
			{
				key: 'save-as-new',
				label: (
					<AuthZTooltip checks={[SavedViewCreatePermission]}>
						<span data-testid="saved-views-save-as-new">Save as new view</span>
					</AuthZTooltip>
				),
				disabled: isCreateDisabled,
				className: isCreateDisabled ? styles.deniedItem : undefined,
				onClick: onSaveAsNew,
			},
			{
				key: 'update',
				label: (
					<AuthZTooltip checks={[updatePermission]}>
						<span data-testid="saved-views-update">Update selected view</span>
					</AuthZTooltip>
				),
				disabled: isUpdateDisabled,
				className: isUpdateDisabled ? styles.deniedItem : undefined,
				onClick: onUpdate,
			},
		];
	}, [isLoading, deniedPermissions, updatePermission, onSaveAsNew, onUpdate]);

	return (
		<DropdownMenuSimple menu={{ items }} align="end" className={styles.menu}>
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
