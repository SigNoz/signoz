import { useMemo } from 'react';
import {
	Braces,
	Ellipsis,
	PenLine,
	SquareArrowOutUpRight,
	Trash2,
} from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';
import { AlertmanagertypesListedNotificationChannelDTO } from 'api/generated/services/sigNoz.schemas';

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
	const menuItems = useMemo<DropdownItemType[]>(
		() => [
			{
				type: 'item',
				value: 'open',
				label: 'Edit',
				prefix: <PenLine size={14} />,
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
				danger: true,
				onClick: (): void => onDelete(channel),
			},
		],
		[channel, onOpen, onDelete, onViewJson],
	);

	return (
		// the row itself opens the channel, so the actions keep their clicks
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
		<div
			className={styles.actions}
			onClick={(event): void => event.stopPropagation()}
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
