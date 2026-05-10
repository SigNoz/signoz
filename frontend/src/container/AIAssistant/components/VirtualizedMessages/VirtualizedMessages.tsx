import { useCallback, useEffect, useRef } from 'react';
import { Button } from '@signozhq/ui/button';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import {
	Activity,
	TriangleAlert,
	ChartBar,
	Search,
	Zap,
	Sparkles,
} from '@signozhq/icons';

import { useAIAssistantStore } from '../../store/useAIAssistantStore';
import { Message, StreamingEventItem } from '../../types';
import MessageBubble from '../MessageBubble';
import StreamingMessage from '../StreamingMessage';

import styles from './VirtualizedMessages.module.scss';

const SUGGESTIONS = [
	{
		icon: TriangleAlert,
		text: 'Show me the top errors in the last hour',
	},
	{
		icon: Activity,
		text: 'What services have the highest latency?',
	},
	{
		icon: ChartBar,
		text: 'Give me an overview of system health',
	},
	{
		icon: Search,
		text: 'Find slow database queries',
	},
	{
		icon: Zap,
		text: 'Which endpoints have the most 5xx errors?',
	},
];

const EMPTY_EVENTS: StreamingEventItem[] = [];

interface VirtualizedMessagesProps {
	conversationId: string;
	messages: Message[];
	isStreaming: boolean;
}

export default function VirtualizedMessages({
	conversationId,
	messages,
	isStreaming,
}: VirtualizedMessagesProps): JSX.Element {
	const sendMessage = useAIAssistantStore((s) => s.sendMessage);
	const regenerateAssistantMessage = useAIAssistantStore(
		(s) => s.regenerateAssistantMessage,
	);
	const streamingStatus = useAIAssistantStore(
		(s) => s.streams[conversationId]?.streamingStatus ?? '',
	);
	const streamingEvents = useAIAssistantStore(
		(s) => s.streams[conversationId]?.streamingEvents ?? EMPTY_EVENTS,
	);
	// Text deltas append into the last `streamingEvents` entry rather than
	// pushing a new one, so `streamingEvents.length` doesn't grow as the
	// assistant streams text. Tracking the content length gives us a per-chunk
	// scroll trigger.
	const streamingContentLength = useAIAssistantStore(
		(s) => s.streams[conversationId]?.streamingContent.length ?? 0,
	);
	const pendingApproval = useAIAssistantStore(
		(s) => s.streams[conversationId]?.pendingApproval ?? null,
	);
	const pendingClarification = useAIAssistantStore(
		(s) => s.streams[conversationId]?.pendingClarification ?? null,
	);

	const virtuosoRef = useRef<VirtuosoHandle>(null);
	const scrollerRef = useRef<HTMLElement | Window | null>(null);

	const handleRegenerate = useCallback(
		(messageId: string): void => {
			if (isStreaming) {
				return;
			}
			void regenerateAssistantMessage(conversationId, messageId);
		},
		[conversationId, isStreaming, regenerateAssistantMessage],
	);

	// Scroll all the way to the actual bottom — including the 64px of bottom
	// padding on the scroller — so the last bubble has visible breathing room
	// above the disclaimer / input bar. Virtuoso's `scrollToIndex(LAST,
	// align: 'end')` would only reach the last item's bottom and leave the
	// padding hidden below the fold. Use `auto` while streaming so the bottom
	// stays glued as text deltas arrive; `smooth` lags when triggered every
	// few ms.
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!(scroller instanceof HTMLElement)) {
			return;
		}
		scroller.scrollTo({
			top: scroller.scrollHeight,
			behavior: isStreaming ? 'auto' : 'smooth',
		});
	}, [
		messages.length,
		streamingEvents.length,
		streamingContentLength,
		isStreaming,
		pendingApproval,
		pendingClarification,
	]);

	const followOutput = useCallback(
		(atBottom: boolean): false | 'auto' | 'smooth' => {
			if (isStreaming) {
				return 'auto';
			}
			return atBottom ? 'smooth' : false;
		},
		[isStreaming],
	);

	const showStreamingSlot =
		isStreaming || Boolean(pendingApproval) || Boolean(pendingClarification);

	if (messages.length === 0 && !showStreamingSlot) {
		return (
			<div className={styles.empty}>
				<div className={styles.emptyIcon}>
					<Sparkles size={24} color="var(--primary)" />
				</div>
				<h3 className={styles.emptyTitle}>SigNoz AI Assistant</h3>
				<p className={styles.emptySubtitle}>
					Ask questions about your traces, logs, metrics, and infrastructure.
				</p>
				<div className={styles.emptySuggestions}>
					{SUGGESTIONS.map((s) => (
						<Button
							key={s.text}
							variant="outlined"
							color="secondary"
							className={styles.emptyChip}
							onClick={(): void => {
								sendMessage(s.text);
							}}
							prefix={<s.icon size={14} />}
						>
							{s.text}
						</Button>
					))}
				</div>
			</div>
		);
	}

	const totalCount = messages.length + (showStreamingSlot ? 1 : 0);

	return (
		<Virtuoso
			ref={virtuosoRef}
			scrollerRef={(ref): void => {
				scrollerRef.current = ref;
			}}
			className={styles.messages}
			totalCount={totalCount}
			followOutput={followOutput}
			initialTopMostItemIndex={Math.max(0, totalCount - 1)}
			itemContent={(index): JSX.Element => {
				if (index < messages.length) {
					const msg = messages[index];
					const isLastAssistant =
						msg.role === 'assistant' &&
						messages.slice(index + 1).every((m) => m.role !== 'assistant');
					return (
						<MessageBubble
							message={msg}
							onRegenerate={
								isLastAssistant && !showStreamingSlot
									? (): void => handleRegenerate(msg.id)
									: undefined
							}
							isLastAssistant={isLastAssistant}
						/>
					);
				}
				return (
					<StreamingMessage
						conversationId={conversationId}
						events={streamingEvents}
						status={streamingStatus}
						pendingApproval={pendingApproval}
						pendingClarification={pendingClarification}
					/>
				);
			}}
		/>
	);
}
