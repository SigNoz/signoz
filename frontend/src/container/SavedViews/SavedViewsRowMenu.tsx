import { useMemo } from 'react';
import { Ellipsis } from '@signozhq/icons';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';

import { SAVED_VIEW_ROW_ACTIONS } from './constants';
import SavedViewsRowButton from './SavedViewsRowButton';
import { SavedViewsRowMenuProps } from './types';

function SavedViewsRowMenu({
	onAction,
	onOpen,
}: SavedViewsRowMenuProps): JSX.Element {
	const items = useMemo<DropdownItemType[]>(
		() =>
			SAVED_VIEW_ROW_ACTIONS.flatMap(
				({
					key,
					label,
					icon: Icon,
					danger,
					hasDividerBefore,
				}): DropdownItemType[] => [
					...(hasDividerBefore
						? [{ type: 'separator' as const, value: `separator-${key}` }]
						: []),
					{
						type: 'item' as const,
						value: key,
						label,
						prefix: <Icon size={14} />,
						danger,
						onClick: (): void => onAction(key),
					},
				],
			),
		[onAction],
	);

	return (
		<Dropdown
			items={items}
			nativeButton
			side="right"
			align="start"
			onOpenChange={(open): void => {
				if (open) {
					onOpen();
				}
			}}
		>
			<SavedViewsRowButton
				icon={<Ellipsis size={14} />}
				label="More options"
				tooltip="More options"
				testId="saved-views-row-menu"
			/>
		</Dropdown>
	);
}

export default SavedViewsRowMenu;
