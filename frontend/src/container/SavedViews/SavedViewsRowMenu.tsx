import { useMemo } from 'react';
import { Ellipsis } from '@signozhq/icons';
import AuthZDropdown from 'lib/authz/components/AuthZDropdown/AuthZDropdown';
import type { AuthZDropdownItemType } from 'lib/authz/components/AuthZDropdown/types';

import { SAVED_VIEW_ROW_ACTIONS } from './constants';
import SavedViewsRowButton from './SavedViewsRowButton';
import { SavedViewsRowMenuProps } from './types';

function SavedViewsRowMenu({
	viewId,
	onAction,
	onOpen,
}: SavedViewsRowMenuProps): JSX.Element {
	const items = useMemo<AuthZDropdownItemType[]>(
		() =>
			SAVED_VIEW_ROW_ACTIONS.flatMap(
				({
					key,
					label,
					icon: Icon,
					danger,
					hasDividerBefore,
					buildPermission,
				}): AuthZDropdownItemType[] => [
					...(hasDividerBefore
						? [{ type: 'separator' as const, value: `separator-${key}` }]
						: []),
					{
						type: 'item' as const,
						value: key,
						label,
						prefix: <Icon size={14} />,
						danger,
						checks: buildPermission ? [buildPermission(viewId)] : undefined,
						onClick: (): void => onAction(key),
					},
				],
			),
		[viewId, onAction],
	);

	return (
		<AuthZDropdown
			items={items}
			nativeButton
			side="right"
			align="start"
			onOpenChange={(open): void => {
				if (open) {
					onOpen();
				}
			}}
			testId="saved-views-row-menu"
		>
			<SavedViewsRowButton
				icon={<Ellipsis size={14} />}
				label="More options"
				tooltip="More options"
				testId="saved-views-row-menu"
			/>
		</AuthZDropdown>
	);
}

export default SavedViewsRowMenu;
