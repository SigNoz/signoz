import { useMemo } from 'react';
import { Ellipsis } from '@signozhq/icons';
import { DropdownMenuSimple, type MenuItem } from '@signozhq/ui/dropdown-menu';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

import { SAVED_VIEW_ROW_ACTIONS } from './constants';
import SavedViewsRowButton from './SavedViewsRowButton';
import { SavedViewsRowMenuProps } from './types';

import styles from './SavedViewsMenu.module.scss';

function SavedViewsRowMenu({
	viewId,
	onAction,
	onOpen,
}: SavedViewsRowMenuProps): JSX.Element {
	const permissions = useMemo(
		() =>
			SAVED_VIEW_ROW_ACTIONS.flatMap(({ buildPermission }) =>
				buildPermission ? [buildPermission(viewId)] : [],
			),
		[viewId],
	);
	const { deniedPermissions } = useAuthZ(permissions);

	const items = useMemo<MenuItem[]>(
		() =>
			SAVED_VIEW_ROW_ACTIONS.flatMap(
				({
					key,
					label,
					icon: Icon,
					danger,
					hasDividerBefore,
					buildPermission,
				}): MenuItem[] => {
					const permission = buildPermission?.(viewId);
					const isDenied = !!permission && deniedPermissions.includes(permission);
					return [
						...(hasDividerBefore ? [{ type: 'divider' as const }] : []),
						{
							key,
							label: permission ? (
								<AuthZTooltip checks={[permission]}>
									<span>{label}</span>
								</AuthZTooltip>
							) : (
								label
							),
							icon: <Icon size={14} />,
							danger,
							disabled: isDenied,
							className: isDenied ? styles.deniedItem : undefined,
							onClick: (): void => onAction(key),
						},
					];
				},
			),
		[viewId, deniedPermissions, onAction],
	);

	return (
		<DropdownMenuSimple
			menu={{ items }}
			side="right"
			align="start"
			className={styles.menu}
		>
			<SavedViewsRowButton
				icon={<Ellipsis size={14} />}
				label="More options"
				tooltip="More options"
				testId="saved-views-row-menu"
				onPointerDown={onOpen}
				onKeyDown={onOpen}
			/>
		</DropdownMenuSimple>
	);
}

export default SavedViewsRowMenu;
