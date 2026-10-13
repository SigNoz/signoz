import { useMemo } from 'react';
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
	const { canEdit, canDelete, hasError, deletePermission } =
		useNotificationChannelPermissions(channel.id);

	// A failed check is not a denial: fall open and let the API decide, the way
	// the collection hook documents.
	const mayEdit = canEdit || hasError;
	const mayDelete = canDelete || hasError;

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
