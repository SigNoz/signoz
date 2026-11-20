import { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import cx from 'classnames';
import ROUTES from 'constants/routes';
import { getAbsoluteUrl } from 'utils/basePath';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { toast } from '@signozhq/ui/sonner';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';

import {
	Archive,
	ArchiveRestore,
	EllipsisVertical,
	Link,
	Pencil,
} from '@signozhq/icons';

import { useAIAssistantStore } from '../../store/useAIAssistantStore';
import { Conversation } from '../../types';
import { formatRelativeTime } from '../../utils/formatRelativeTime';

import styles from './ConversationItem.module.scss';

interface ConversationItemProps {
	conversation: Conversation;
	isActive: boolean;
	onSelect: (id: string) => void;
	onRename: (id: string, title: string) => void;
	onArchive: (id: string) => void;
	onRestore: (id: string) => void;
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
	const isReplying = useAIAssistantStore((s) =>
		Boolean(s.streams[conversation.id]?.isStreaming),
	);
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
	const baseItems: DropdownItemType[] = [
		{
			type: 'item',
			value: 'rename',
			label: 'Rename',
			prefix: <Pencil size={16} />,
			onClick: (): void => startEditing(),
		},
		{
			type: 'item',
			value: 'copy-link',
			label: 'Copy link',
			prefix: <Link size={16} />,
			onClick: handleCopyLink,
		},
		{ type: 'separator', value: 'divider' },
	];
	const menuItems: DropdownItemType[] = isArchived
		? [
				...baseItems,
				{
					type: 'item',
					value: 'restore',
					label: 'Restore',
					prefix: <ArchiveRestore size={16} />,
					onClick: (): void => onRestore(conversation.id),
				},
			]
		: [
				...baseItems,
				{
					type: 'item',
					value: 'archive',
					label: 'Archive',
					prefix: <Archive size={16} />,
					danger: true,
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
			<span className={cx(styles.dot, { [styles.isReplying]: isReplying })} />

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
					<Dropdown items={menuItems} nativeButton align="end" side="bottom">
						<Button
							variant="link"
							size="sm"
							icon
							color="secondary"
							aria-label="Conversation actions"
						>
							<EllipsisVertical size={12} />
						</Button>
					</Dropdown>
				</div>
			)}
		</div>
	);
}
