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
import { DropdownMenuSimple } from '@signozhq/ui/dropdown-menu';
import { AlertmanagertypesListedNotificationChannelDTO } from 'api/generated/services/sigNoz.schemas';
import { useNotificationChannelPermissions } from 'hooks/notificationChannels/useNotificationChannelPermissions';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';

import styles from './ChannelActionsMenu.module.scss';

interface ChannelActionsMenuProps {
	channel: AlertmanagertypesListedNotificationChannelDTO;
	onOpen: (
		channel: AlertmanagertypesListedNotificationChannelDTO,
		options?: { newTab?: boolean },
	) => void;
	onDelete: (channel: AlertmanagertypesListedNotificationChannelDTO) => void;
	onViewJson: (channel: AlertmanagertypesListedNotificationChannelDTO) => void;
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

	const menuItems = useMemo(
		() => [
			{
				key: 'open',
				label: openLabel,
				icon: mayEdit ? <PenLine size={14} /> : <Eye size={14} />,
				onClick: (): void => onOpen(channel),
			},
			{
				key: 'open-new-tab',
				label: 'Open in New Tab',
				icon: <SquareArrowOutUpRight size={14} />,
				onClick: (): void => onOpen(channel, { newTab: true }),
			},
			{
				key: 'view-json',
				label: 'View JSON',
				icon: <Braces size={14} />,
				onClick: (): void => onViewJson(channel),
			},
			{ key: 'divider', type: 'divider' as const },
			{
				key: 'delete',
				// the tooltip is what tells a denied user why the item is dead
				label: (
					<AuthZTooltip checks={mayDelete ? [] : [deletePermission]} side="left">
						<span>Delete</span>
					</AuthZTooltip>
				),
				icon: <Trash2 size={14} />,
				disabled: !mayDelete,
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
			<DropdownMenuSimple menu={{ items: menuItems }} align="end">
				<Button
					variant="outlined"
					color="secondary"
					size="icon"
					className={styles.actionButton}
					data-testid={`channel-actions-${channel.id}`}
					aria-label={`Actions for ${channel.displayName}`}
				>
					<Ellipsis size={16} />
				</Button>
			</DropdownMenuSimple>
		</div>
	);
}

export default ChannelActionsMenu;
