import { useMemo } from 'react';
import { Ellipsis } from '@signozhq/icons';
import { DropdownMenuSimple, type MenuItem } from '@signozhq/ui/dropdown-menu';

import { SAVED_VIEW_ROW_ACTIONS } from './constants';
import SavedViewsRowButton from './SavedViewsRowButton';
import { SavedViewsRowMenuProps } from './types';

function SavedViewsRowMenu({
	onAction,
	onOpen,
}: SavedViewsRowMenuProps): JSX.Element {
	const items = useMemo<MenuItem[]>(
		() =>
			SAVED_VIEW_ROW_ACTIONS.flatMap(
				({ key, label, icon: Icon, danger, hasDividerBefore }): MenuItem[] => [
					...(hasDividerBefore ? [{ type: 'divider' as const }] : []),
					{
						key,
						label,
						icon: <Icon size={14} />,
						danger,
						onClick: (): void => onAction(key),
					},
				],
			),
		[onAction],
	);

	return (
		<DropdownMenuSimple menu={{ items }} side="right" align="start">
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
