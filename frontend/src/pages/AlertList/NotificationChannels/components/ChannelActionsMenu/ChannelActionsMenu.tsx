import { useCallback, useMemo, useState } from 'react';
import {
	Braces,
	Ellipsis,
	Eye,
	PenLine,
	SquareArrowOutUpRight,
	Trash2,
} from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { useNotificationChannelPermissions } from 'hooks/notificationChannels/useNotificationChannelPermissions';
import AuthZDropdown from 'lib/authz/components/AuthZDropdown/AuthZDropdown';
import type { AuthZDropdownItemType } from 'lib/authz/components/AuthZDropdown/types';

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
	// A list of N channels would otherwise check its verbs per row on mount, for
	// menus nobody opened, and the authz API caps one batch at 25 transactions.
	const [hasOpened, setHasOpened] = useState(false);
	const { canEdit, deletePermission } = useNotificationChannelPermissions(
		channel.id,
		{ enabled: hasOpened },
	);

	// Without `update` the same screen is still readable, so the action opens it
	// as a view rather than disappearing.
	const openLabel = canEdit ? 'Edit' : 'View';

	const menuItems = useMemo<AuthZDropdownItemType[]>(
		() => [
			{
				type: 'item',
				value: 'open',
				label: openLabel,
				prefix: canEdit ? <PenLine size={14} /> : <Eye size={14} />,
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
				label: 'Delete',
				prefix: <Trash2 size={14} />,
				checks: [deletePermission],
				danger: true,
				onClick: (): void => onDelete(channel),
			},
		],
		[openLabel, canEdit, deletePermission, channel, onOpen, onDelete, onViewJson],
	);

	const handleOpenChange = useCallback((open: boolean): void => {
		if (open) {
			setHasOpened(true);
		}
	}, []);

	return (
		// the row itself opens the channel, so the actions keep their clicks
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
		<div
			className={styles.actions}
			onClick={(event): void => event.stopPropagation()}
		>
			<AuthZDropdown
				items={menuItems}
				nativeButton
				align="end"
				side="bottom"
				onOpenChange={handleOpenChange}
			>
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
			</AuthZDropdown>
		</div>
	);
}

export default ChannelActionsMenu;
