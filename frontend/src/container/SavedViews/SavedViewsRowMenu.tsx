import { useCallback, useMemo, useState } from 'react';
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
	// Checked once the menu is first opened, not for every row in the list.
	const [hasOpened, setHasOpened] = useState(false);
	const { isLoading, deniedPermissions } = useAuthZ(permissions, {
		enabled: hasOpened,
	});
	const isChecking = !hasOpened || isLoading;

	const handleOpen = useCallback((): void => {
		setHasOpened(true);
		onOpen();
	}, [onOpen]);

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
					const isDisabled =
						!!permission && (isChecking || deniedPermissions.includes(permission));
					const labelText = (
						<span data-testid={`saved-views-row-menu-${key}`}>{label}</span>
					);
					return [
						...(hasDividerBefore ? [{ type: 'divider' as const }] : []),
						{
							key,
							label: permission ? (
								<AuthZTooltip checks={[permission]} enabled={hasOpened}>
									{labelText}
								</AuthZTooltip>
							) : (
								labelText
							),
							icon: <Icon size={14} />,
							danger,
							disabled: isDisabled,
							className: isDisabled ? styles.deniedItem : undefined,
							onClick: (): void => onAction(key),
						},
					];
				},
			),
		[viewId, hasOpened, isChecking, deniedPermissions, onAction],
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
				onPointerDown={handleOpen}
				onKeyDown={handleOpen}
			/>
		</DropdownMenuSimple>
	);
}

export default SavedViewsRowMenu;
