import { useMemo, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Conversation } from 'container/AIAssistant/types';
import { formatRelativeTime } from 'container/AIAssistant/utils/formatRelativeTime';

import styles from './NozHistory.module.scss';

const UNTITLED = 'New conversation';

interface NozHistoryListProps {
	conversations: Conversation[];
	onSelect: (conversation: Conversation) => void;
}

function NozHistoryList({
	conversations,
	onSelect,
}: NozHistoryListProps): JSX.Element {
	const [query, setQuery] = useState('');
	const trimmedQuery = query.trim();

	const matches = useMemo(() => {
		const needle = trimmedQuery.toLowerCase();
		return needle
			? conversations.filter((c) =>
					(c.title ?? UNTITLED).toLowerCase().includes(needle),
				)
			: conversations;
	}, [conversations, trimmedQuery]);

	return (
		<div className={styles.content}>
			<div className={styles.search}>
				<Input
					type="text"
					value={query}
					onChange={(e): void => setQuery(e.target.value)}
					placeholder="Search…"
					aria-label="Search conversations"
					testId="noz-history-search"
				/>
			</div>
			<div className={styles.list}>
				{matches.length > 0 ? (
					<>
						<div className={styles.label}>Earlier conversations</div>
						{matches.map((conversation) => (
							<Button
								key={conversation.id}
								variant="ghost"
								color="secondary"
								size="md"
								suffix={
									<span className={styles.time}>
										{formatRelativeTime(conversation.updatedAt ?? conversation.createdAt)}
									</span>
								}
								onClick={(): void => onSelect(conversation)}
								testId="noz-history-item"
							>
								{conversation.title ?? UNTITLED}
							</Button>
						))}
					</>
				) : (
					<div className={styles.empty} data-testid="noz-history-empty">
						No conversations match “{trimmedQuery}”
					</div>
				)}
			</div>
		</div>
	);
}

export default NozHistoryList;
