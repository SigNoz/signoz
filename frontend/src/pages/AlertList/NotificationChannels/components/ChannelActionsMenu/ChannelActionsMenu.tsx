import { useMemo, useState } from 'react';
import {
	Braces,
	Ellipsis,
	Eye,
	PenLine,
	SquareArrowOutUpRight,
	Trash2,
} from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';
import { useNotificationChannelPermissions } from 'hooks/notificationChannels/useNotificationChannelPermissions';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';

import type { Channel } from '../../types';
import styles from './ChannelActionsMenu.module.scss';

interface ChannelActionsMenuProps {
	channel: Channel;
	onOpen: (channel: Channel, options?: { newTab?: boolean }) => void;
	onDelete: (channel: Channel) => void;
	onViewJson: (channel: Channel) => void;
}

function ChannelActionsMenu({
	channel,
	onOpen,
	onDelete,
	onViewJson,
}: ChannelActionsMenuProps): JSX.Element {
	// A list of N channels would otherwise check three verbs per row on mount,
	// for menus nobody opened, and the authz API caps one batch at 25
	// transactions. Only the row whose menu was opened pays for its checks.
	const [menuOpened, setMenuOpened] = useState(false);
	const { canEdit, canDelete, isLoading, hasError, deletePermission } =
		useNotificationChannelPermissions(channel.id, { enabled: menuOpened });

	// Unknown is not denied: before the menu is opened, while the check is in
	// flight, and when it failed, the actions stay available and the API decides.
	const resolved = menuOpened && !isLoading && !hasError;
	const mayEdit = !resolved || canEdit;
	const mayDelete = !resolved || canDelete;

	// Without `update` the same screen is still readable, so the action opens it
	// as a view rather than disappearing.
	const openLabel = mayEdit ? 'Edit' : 'View';

	const menuItems = useMemo<DropdownItemType[]>(
		() => [
			{
				type: 'item',
				value: 'open',
				label: openLabel,
				prefix: mayEdit ? <PenLine size={14} /> : <Eye size={14} />,
				onClick: (): void => onOpen(channel),
			},
			{
				type: 'item',
				value: 'open-new-tab',
				label: 'Open in New Tab',
				prefix: <SquareArrowOutUpRight size={14} />,
				onClick: (): void => onOpen(channel, { newTab: true }),
			},
			{
				type: 'item',
				value: 'view-json',
				label: 'View JSON',
				prefix: <Braces size={14} />,
				onClick: (): void => onViewJson(channel),
			},
			{ type: 'separator', value: 'before-delete' },
			{
				type: 'item',
				value: 'delete',
				// the tooltip is what tells a denied user why the item is dead
				label: (
					<AuthZTooltip checks={mayDelete ? [] : [deletePermission]} side="left">
						<span>Delete</span>
					</AuthZTooltip>
				),
				prefix: <Trash2 size={14} />,
				disabled: !mayDelete,
				// the reason is already on the label's AuthZTooltip, which names the
				// permission the user is missing
				disabledTooltip: undefined,
				danger: true,
				onClick: (): void => onDelete(channel),
			},
		],
		[
			openLabel,
			mayEdit,
			mayDelete,
			deletePermission,
			channel,
			onOpen,
			onDelete,
			onViewJson,
		],
	);

	return (
		// the row itself opens the channel, so the actions keep their clicks
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
		<div
			className={styles.actions}
			onClick={(event): void => event.stopPropagation()}
			// Radix opens the menu on pointerdown and seals the click away, so the
			// latch has to run before that
			onPointerDown={(): void => setMenuOpened(true)}
		>
			<Dropdown items={menuItems} nativeButton align="end" side="bottom">
				<Button
					variant="outlined"
					color="secondary"
					size="sm"
					icon
					testId={`channel-actions-${channel.id}`}
					aria-label={`Actions for ${channel.displayName}`}
				>
					<Ellipsis size={16} />
				</Button>
			</Dropdown>
		</div>
	);
}

export default ChannelActionsMenu;
