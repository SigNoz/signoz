import { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import cx from 'classnames';
import ROUTES from 'constants/routes';
import { getAbsoluteUrl } from 'utils/basePath';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { toast } from '@signozhq/ui/sonner';
import { DropdownMenuSimple } from '@signozhq/ui/dropdown-menu';

import {
	Archive,
	ArchiveRestore,
	EllipsisVertical,
	Link,
	MessageSquare,
	Pencil,
} from '@signozhq/icons';

import { Conversation } from '../../types';

import styles from './ConversationItem.module.scss';

interface ConversationItemProps {
	conversation: Conversation;
	isActive: boolean;
	onSelect: (id: string) => void;
	onRename: (id: string, title: string) => void;
	onArchive: (id: string) => void;
	onRestore: (id: string) => void;
}

function formatRelativeTime(ts: number): string {
	if (!Number.isFinite(ts)) {
		return '';
	}
	const diff = Date.now() - ts;
	const mins = Math.floor(diff / 60_000);
	if (mins < 1) {
		return 'just now';
	}
	if (mins < 60) {
		return `${mins}m ago`;
	}
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) {
		return `${hrs}h ago`;
	}
	const days = Math.floor(hrs / 24);
	if (days < 7) {
		return `${days}d ago`;
	}
	return new Date(ts).toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
	});
}

export default function ConversationItem({
	conversation,
	isActive,
	onSelect,
	onRename,
	onArchive,
	onRestore,
}: ConversationItemProps): JSX.Element {
	const [isEditing, setIsEditing] = useState(false);
	const [editValue, setEditValue] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	const [, copyToClipboard] = useCopyToClipboard();

	const isArchived = Boolean(conversation.archived);
	const displayTitle = conversation.title ?? 'New conversation';
	const ts = conversation.updatedAt ?? conversation.createdAt;

	const handleCopyLink = useCallback((): void => {
		// Prefer the server-side `threadId` so the link resolves for anyone
		// with access to this conversation. Fall back to the local id for
		// drafts that haven't synced yet — useful for the current session
		// even if the URL won't reload elsewhere.
		const id = conversation.threadId ?? conversation.id;
		const path = ROUTES.AI_ASSISTANT.replace(':conversationId', id);
		copyToClipboard(getAbsoluteUrl(path));
		toast.success('Conversation link copied to clipboard');
	}, [conversation.threadId, conversation.id, copyToClipboard]);

	const startEditing = useCallback((): void => {
		setEditValue(conversation.title ?? '');
		setIsEditing(true);
	}, [conversation.title]);

	useEffect(() => {
		if (isEditing) {
			inputRef.current?.focus();
			inputRef.current?.select();
		}
	}, [isEditing]);

	const commitEdit = useCallback(() => {
		onRename(conversation.id, editValue);
		setIsEditing(false);
	}, [conversation.id, editValue, onRename]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') {
				commitEdit();
			}
			if (e.key === 'Escape') {
				setIsEditing(false);
			}
		},
		[commitEdit],
	);

	const itemClass = cx(styles.item, {
		[styles.active]: isActive,
		[styles.archived]: isArchived,
	});

	// Dropdown items mirror the previous inline buttons but live in a single
	// trigger so the row stays compact. Archive/Restore swap based on the
	// archived state — same handler wiring as before.
	const baseItems = [
		{
			key: 'rename',
			label: 'Rename',
			icon: <Pencil size={12} />,
			className: styles.menuItem,
			onClick: (): void => startEditing(),
		},
		{
			key: 'copy-link',
			label: 'Copy link',
			icon: <Link size={12} />,
			className: styles.menuItem,
			onClick: handleCopyLink,
		},
		{ type: 'divider' as const, key: 'divider' },
	];
	const menuItems = isArchived
		? [
				...baseItems,
				{
					key: 'restore',
					label: 'Restore',
					icon: <ArchiveRestore size={12} />,
					className: cx(styles.menuItem, styles.restoreItem),
					onClick: (): void => onRestore(conversation.id),
				},
			]
		: [
				...baseItems,
				{
					key: 'archive',
					label: 'Archive',
					icon: <Archive size={12} />,
					className: cx(styles.menuItem, styles.archiveItem),
					onClick: (): void => onArchive(conversation.id),
				},
			];

	return (
		<div
			className={itemClass}
			onClick={(): void => onSelect(conversation.id)}
			role="button"
			tabIndex={0}
			onKeyDown={(e): void => {
				if (e.key === 'Enter' || e.key === ' ') {
					onSelect(conversation.id);
				}
			}}
		>
			<MessageSquare size={12} className={styles.icon} />

			<div className={styles.body}>
				{isEditing ? (
					<Input
						ref={inputRef}
						className={styles.input}
						value={editValue}
						onChange={(e): void => setEditValue(e.target.value)}
						onKeyDown={handleKeyDown}
						onBlur={commitEdit}
						onClick={(e): void => e.stopPropagation()}
						maxLength={80}
					/>
				) : (
					<>
						<span className={styles.title} title={displayTitle}>
							{displayTitle}
						</span>
						<span className={styles.time}>{formatRelativeTime(ts)}</span>
					</>
				)}
			</div>

			{!isEditing && (
				<div
					className={styles.actions}
					// Stop the row's onSelect from firing when the user opens the
					// menu or clicks an item — the menu lives in a portal so its
					// own clicks don't bubble, but the trigger button does.
					onClick={(e): void => e.stopPropagation()}
				>
					<DropdownMenuSimple
						menu={{ items: menuItems }}
						align="end"
						sideOffset={4}
						className={styles.menu}
					>
						<Button
							variant="link"
							size="icon"
							color="none"
							className={styles.btn}
							aria-label="Conversation actions"
							prefix={<EllipsisVertical size={12} />}
						/>
					</DropdownMenuSimple>
				</div>
			)}
		</div>
	);
}
