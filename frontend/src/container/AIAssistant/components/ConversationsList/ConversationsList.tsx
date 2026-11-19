import { useEffect, useMemo, useState } from 'react';
import cx from 'classnames';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Plus } from '@signozhq/icons';

import { useOpenConversation } from '../../hooks/useOpenConversation';
import { useAIAssistantStore } from '../../store/useAIAssistantStore';
import { Conversation } from '../../types';
import { useVariant } from '../../VariantContext';
import ConversationItem from '../ConversationItem';

import styles from './ConversationsList.module.scss';

interface ConversationsListProps {
	/** Called when a conversation is selected — lets the parent navigate if needed */
	onSelect?: (id: string) => void;
	onNewConversation?: () => void;
	showAddNewConversation?: boolean;
}

function groupByDate(
	conversations: Conversation[],
): { label: string; items: Conversation[] }[] {
	const now = Date.now();
	const DAY = 86_400_000;

	const groups: Record<string, Conversation[]> = {
		Today: [],
		Yesterday: [],
		'Last 7 days': [],
		'Last 30 days': [],
		Older: [],
	};

	for (const conv of conversations) {
		const age = now - (conv.updatedAt ?? conv.createdAt);
		if (age < DAY) {
			groups.Today.push(conv);
		} else if (age < 2 * DAY) {
			groups.Yesterday.push(conv);
		} else if (age < 7 * DAY) {
			groups['Last 7 days'].push(conv);
		} else if (age < 30 * DAY) {
			groups['Last 30 days'].push(conv);
		} else {
			groups.Older.push(conv);
		}
	}

	return Object.entries(groups)
		.filter(([, items]) => items.length > 0)
		.map(([label, items]) => ({ label, items }));
}

/**
 * Three-dot loading indicator. Sits beside the search field so the
 * conversation list is never bumped down by a skeleton row when threads
 * load — visible signal of in-flight work without any layout shift.
 */
function LoadingDots(): JSX.Element {
	return (
		<span className={styles.loadingDots} role="status" aria-label="Loading">
			<span className={styles.loadingDot} />
			<span className={styles.loadingDot} />
			<span className={styles.loadingDot} />
		</span>
	);
}

export default function ConversationsList({
	onSelect,
	onNewConversation,
	showAddNewConversation = false,
}: ConversationsListProps): JSX.Element {
	const variant = useVariant();
	const conversations = useAIAssistantStore((s) => s.conversations);
	const activeConversationId = useAIAssistantStore(
		(s) => s.activeConversationId,
	);
	const isLoadingThreads = useAIAssistantStore((s) => s.isLoadingThreads);
	const openConversation = useOpenConversation();
	const fetchThreads = useAIAssistantStore((s) => s.fetchThreads);
	const archiveConversation = useAIAssistantStore((s) => s.archiveConversation);
	const restoreConversation = useAIAssistantStore((s) => s.restoreConversation);
	const renameConversation = useAIAssistantStore((s) => s.renameConversation);

	const [searchQuery, setSearchQuery] = useState('');

	// Fetch threads from backend on mount
	useEffect(() => {
		void fetchThreads();
	}, [fetchThreads]);

	// Case-insensitive substring match against the conversation title.
	// Untitled conversations match the literal placeholder so users
	// searching for "new" can still find them.
	const trimmedQuery = searchQuery.trim().toLowerCase();
	const matchesQuery = (c: Conversation): boolean => {
		if (!trimmedQuery) {
			return true;
		}
		const title = (c.title ?? 'New conversation').toLowerCase();
		return title.includes(trimmedQuery);
	};

	const sortedActive = useMemo(
		() =>
			Object.values(conversations)
				.filter((c) => !c.archived && matchesQuery(c))
				.sort(
					(a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt),
				),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[conversations, trimmedQuery],
	);

	const sortedArchived = useMemo(
		() =>
			Object.values(conversations)
				.filter((c) => Boolean(c.archived) && c.threadId && matchesQuery(c))
				.sort(
					(a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt),
				),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[conversations, trimmedQuery],
	);

	const groups = useMemo(() => groupByDate(sortedActive), [sortedActive]);

	const hasAnySidebarRows = groups.length > 0 || sortedArchived.length > 0;
	const isSearching = trimmedQuery.length > 0;

	const handleSelect = (id: string): void => {
		openConversation(id);
		onSelect?.(id);
	};

	const variantClass =
		variant === 'page' ? styles.variantPage : styles.variantPanel;

	return (
		<div className={cx(styles.conversationsList, variantClass)}>
			<div className={styles.searchBar}>
				<div className={styles.search}>
					<Input
						type="text"
						value={searchQuery}
						onChange={(e): void => setSearchQuery(e.target.value)}
						placeholder="Search…"
						aria-label="Search conversations"
					/>
				</div>
				{isLoadingThreads && <LoadingDots />}
			</div>

			{!isLoadingThreads && showAddNewConversation && (
				<div className={styles.newConversation}>
					<Button
						variant="outlined"
						size="md"
						color="secondary"
						width="100%"
						maxWidth="100%"
						prefix={<Plus size={16} />}
						onClick={onNewConversation}
						testId="ai-assistant-new-conversation"
					>
						New conversation
					</Button>
				</div>
			)}

			<div className={styles.list} aria-busy={isLoadingThreads}>
				{isLoadingThreads && (
					<span className={styles.srOnly} role="status">
						Loading conversations
					</span>
				)}

				{!isLoadingThreads && !hasAnySidebarRows && (
					<p className={styles.empty}>
						{isSearching ? 'No matching conversations.' : 'No conversations yet.'}
					</p>
				)}

				{groups.map(({ label, items }) => (
					<div key={label} className={styles.group}>
						<span className={styles.groupLabel}>{label}</span>
						{items.map((conv) => (
							<ConversationItem
								key={conv.id}
								conversation={conv}
								isActive={conv.id === activeConversationId}
								onSelect={handleSelect}
								onRename={renameConversation}
								onArchive={archiveConversation}
								onRestore={restoreConversation}
							/>
						))}
					</div>
				))}

				{sortedArchived.length > 0 && (
					<div className={cx(styles.group, styles.archived)}>
						<span className={styles.groupLabel}>Archived Conversations</span>
						{sortedArchived.map((conv) => (
							<ConversationItem
								key={conv.id}
								conversation={conv}
								isActive={conv.id === activeConversationId}
								onSelect={handleSelect}
								onRename={renameConversation}
								onArchive={archiveConversation}
								onRestore={restoreConversation}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
