import { useCallback, useEffect, useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import Noz from 'components/Noz/Noz';

import logEvent from 'api/common/logEvent';

import { AIAssistantEvents, SuggestedPromptCategory } from '../../events';
import { useAIAssistantAnalyticsContext } from '../../hooks/useAIAssistantAnalyticsContext';
import { useAIAssistantStore } from '../../store/useAIAssistantStore';
import { Message, StreamingEventItem } from '../../types';
import MessageBubble from '../MessageBubble';
import StreamingMessage from '../StreamingMessage';

import styles from './VirtualizedMessages.module.scss';
import { useEmptyStateChips } from './useEmptyStateChips';

const EMPTY_EVENTS: StreamingEventItem[] = [];

interface VirtualizedMessagesProps {
	conversationId: string;
	messages: Message[];
	isStreaming: boolean;
	/**
	 * Called when a user clicks an empty-state suggested prompt. Routed
	 * through the parent so analytics (Message sent) fire with the same
	 * page/mode/context attribution as a normal send.
	 */
	onSendSuggestedPrompt: (text: string) => void;
}

export default function VirtualizedMessages({
	conversationId,
	messages,
	isStreaming,
	onSendSuggestedPrompt,
}: VirtualizedMessagesProps): JSX.Element {
	const regenerateAssistantMessage = useAIAssistantStore(
		(s) => s.regenerateAssistantMessage,
	);
	const { threadId } = useAIAssistantAnalyticsContext(conversationId);
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
	// Tracks whether the scroller is pinned to (or near) the bottom. Updated
	// via Virtuoso's `atBottomStateChange` so we can stop force-scrolling the
	// user back down when they've intentionally scrolled up to read earlier
	// content.
	const atBottomRef = useRef(true);
	// Id of the latest user message we've already anchored to. Used to detect
	// a fresh user send so we can re-anchor to the bottom regardless of where
	// the user was scrolled — sending a message and not seeing it is worse
	// than the anti-yank guarantee.
	const lastSeenUserMessageIdRef = useRef<string | null>(null);

	const handleRegenerate = useCallback(
		(messageId: string): void => {
			if (isStreaming) {
				return;
			}
			void logEvent(AIAssistantEvents.RegenerateClicked, {
				messageId,
				threadId,
			});
			void regenerateAssistantMessage(conversationId, messageId);
		},
		[conversationId, isStreaming, regenerateAssistantMessage, threadId],
	);

	// Scroll all the way to the actual bottom — including the 64px of bottom
	// padding on the scroller — so the last bubble has visible breathing room
	// above the disclaimer / input bar. Virtuoso's `scrollToIndex(LAST,
	// align: 'end')` would only reach the last item's bottom and leave the
	// padding hidden below the fold. Use `auto` while streaming so the bottom
	// stays glued as text deltas arrive; `smooth` lags when triggered every
	// few ms. Bail out if the user has scrolled away from the bottom — that's
	// an explicit signal they want to read earlier content without being
	// yanked back.
	useEffect(() => {
		const lastMessage = messages[messages.length - 1];
		const isFreshUserSend =
			lastMessage?.role === 'user' &&
			lastMessage.id !== lastSeenUserMessageIdRef.current;
		if (isFreshUserSend) {
			lastSeenUserMessageIdRef.current = lastMessage.id;
			// Re-anchor so the user sees their own send (and the assistant's
			// follow-up streaming) even if they were reading history when they
			// hit Enter.
			atBottomRef.current = true;
		}

		if (!atBottomRef.current) {
			return;
		}
		const scroller = scrollerRef.current;
		if (!(scroller instanceof HTMLElement)) {
			return;
		}
		scroller.scrollTo({
			top: scroller.scrollHeight,
			behavior: isStreaming ? 'auto' : 'smooth',
		});
	}, [
		messages,
		streamingEvents.length,
		streamingContentLength,
		isStreaming,
		pendingApproval,
		pendingClarification,
	]);

	const followOutput = useCallback(
		(atBottom: boolean): false | 'auto' | 'smooth' => {
			if (!atBottom) {
				return false;
			}
			return isStreaming ? 'auto' : 'smooth';
		},
		[isStreaming],
	);

	const handleAtBottomStateChange = useCallback((atBottom: boolean): void => {
		atBottomRef.current = atBottom;
	}, []);

	const showStreamingSlot =
		isStreaming || Boolean(pendingApproval) || Boolean(pendingClarification);
	const isEmptyState = messages.length === 0 && !showStreamingSlot;
	const { chips: emptyStateChips } = useEmptyStateChips(isEmptyState);

	if (isEmptyState) {
		return (
			<div className={styles.empty}>
				<div className={`${styles.emptyIcon} noz-wave`}>
					<Noz size={48} />
				</div>
				<h3 className={styles.emptyTitle}>Noz</h3>
				<p className={styles.emptySubtitle}>
					Ask questions about your traces, logs, metrics, and infrastructure.
				</p>
				<div className={styles.suggestions}>
					{emptyStateChips.map((chip) => (
						<div
							key={chip.id}
							className={styles.suggestion}
							onClick={(): void => {
								void logEvent(AIAssistantEvents.SuggestedPromptClicked, {
									promptId: chip.id,
									category: SuggestedPromptCategory.EmptyState,
								});
								onSendSuggestedPrompt(chip.text);
							}}
							data-testid={`empty-state-chip-${chip.id}`}
						>
							{chip.text}
						</div>
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
			atBottomStateChange={handleAtBottomStateChange}
			atBottomThreshold={64}
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
