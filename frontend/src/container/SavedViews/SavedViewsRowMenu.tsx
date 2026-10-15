import { useCallback, useMemo, useState } from 'react';
import { Ellipsis } from '@signozhq/icons';
import { DropdownMenuSimple } from '@signozhq/ui/dropdown-menu';
import { useSavedViewMenuItems } from './hooks/useSavedViewMenuItems';

import { SAVED_VIEW_ROW_ACTIONS } from './constants';
import SavedViewsRowButton from './SavedViewsRowButton';
import { SavedViewMenuItem, SavedViewsRowMenuProps } from './types';

function SavedViewsRowMenu({
	viewId,
	onAction,
	onOpen,
}: SavedViewsRowMenuProps): JSX.Element {
	// Checked once the menu is first opened, not for every row in the list.
	const [hasOpened, setHasOpened] = useState(false);

	const handleOpen = useCallback((): void => {
		setHasOpened(true);
		onOpen();
	}, [onOpen]);

	const actionItems = useMemo<SavedViewMenuItem[]>(
		() =>
			SAVED_VIEW_ROW_ACTIONS.flatMap(
				({
					key,
					label,
					icon: Icon,
					danger,
					hasDividerBefore,
					buildPermission,
				}): SavedViewMenuItem[] => [
					...(hasDividerBefore ? [{ type: 'divider' as const }] : []),
					{
						key,
						label: <span data-testid={`saved-views-row-menu-${key}`}>{label}</span>,
						icon: <Icon size={14} />,
						danger,
						checks: buildPermission ? [buildPermission(viewId)] : undefined,
						onClick: (): void => onAction(key),
					},
				],
			),
		[viewId, onAction],
	);
	const items = useSavedViewMenuItems(actionItems, { enabled: hasOpened });

	return (
		<DropdownMenuSimple menu={{ items }} side="right" align="start">
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
