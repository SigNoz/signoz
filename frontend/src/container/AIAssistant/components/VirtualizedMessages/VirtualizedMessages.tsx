import { memo, useCallback, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import cx from 'classnames';
import { Button } from '@signozhq/ui/button';
import { ArrowDown } from '@signozhq/icons';

import type {
	ApprovalEventDTO,
	ClarificationEventDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import logEvent from 'api/common/logEvent';

import { AIAssistantEvents } from '../../events';
import { useAIAssistantAnalyticsContext } from '../../hooks/useAIAssistantAnalyticsContext';
import { useAIAssistantStore } from '../../store/useAIAssistantStore';
import { Message, StreamingEventItem } from '../../types';
import { useVariant } from '../../VariantContext';
import MessageBubble from '../MessageBubble';
import StreamingMessage from '../StreamingMessage';

import EmptyState from './EmptyState/EmptyState';
import styles from './VirtualizedMessages.module.scss';
import { useScrollToSentMessage } from './useScrollToSentMessage';

const EMPTY_EVENTS: StreamingEventItem[] = [];
// Measures rows before they scroll in, so Virtuoso's size corrections stay off-screen.
const PRERENDER_ABOVE_PX = 1500;

interface MessageRowProps {
	className: string;
	message: Message;
	isLastAssistant: boolean;
	canRegenerate: boolean;
	onRegenerate: (messageId: string) => void;
	onRetry: () => void;
}

// Memoized so earlier replies stay put while the list re-renders.
const MessageRow = memo(function MessageRow({
	className,
	message,
	isLastAssistant,
	canRegenerate,
	onRegenerate,
	onRetry,
}: MessageRowProps): JSX.Element {
	const canAct = isLastAssistant && canRegenerate;
	return (
		<div className={className}>
			<MessageBubble
				message={message}
				onRegenerate={canAct ? (): void => onRegenerate(message.id) : undefined}
				onRetry={canAct && message.isError ? onRetry : undefined}
				isLastAssistant={isLastAssistant}
			/>
		</div>
	);
});

interface StreamingRowProps {
	className: string;
	conversationId: string;
	pendingApproval: ApprovalEventDTO | null;
	pendingClarification: ClarificationEventDTO | null;
}

// Reads the reply as it streams, so only this row re-renders on each chunk.
function StreamingRow({
	className,
	conversationId,
	pendingApproval,
	pendingClarification,
}: StreamingRowProps): JSX.Element {
	const streamingStatus = useAIAssistantStore(
		(s) => s.streams[conversationId]?.streamingStatus ?? '',
	);
	const streamingEvents = useAIAssistantStore(
		(s) => s.streams[conversationId]?.streamingEvents ?? EMPTY_EVENTS,
	);
	return (
		<div className={className}>
			<StreamingMessage
				conversationId={conversationId}
				events={streamingEvents}
				status={streamingStatus}
				pendingApproval={pendingApproval}
				pendingClarification={pendingClarification}
			/>
		</div>
	);
}

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
	/** A Snake game on the empty state's dot grid started or ended. */
	onSnakeGameChange?: (isPlaying: boolean) => void;
}

export default function VirtualizedMessages({
	conversationId,
	messages,
	isStreaming,
	onSendSuggestedPrompt,
	onSnakeGameChange,
}: VirtualizedMessagesProps): JSX.Element {
	const regenerateAssistantMessage = useAIAssistantStore(
		(s) => s.regenerateAssistantMessage,
	);
	const retryAssistantMessage = useAIAssistantStore(
		(s) => s.retryAssistantMessage,
	);
	const { threadId } = useAIAssistantAnalyticsContext(conversationId);
	const pendingApproval = useAIAssistantStore(
		(s) => s.streams[conversationId]?.pendingApproval ?? null,
	);
	const pendingClarification = useAIAssistantStore(
		(s) => s.streams[conversationId]?.pendingClarification ?? null,
	);

	const virtuosoRef = useRef<VirtuosoHandle>(null);
	const [isAtBottom, setIsAtBottom] = useState(true);
	useScrollToSentMessage(virtuosoRef, messages);
	const jumpToLatest = useCallback((): void => {
		virtuosoRef.current?.scrollToIndex({
			index: 'LAST',
			align: 'end',
			behavior: 'smooth',
		});
	}, []);
	const isFullPage = useVariant() === 'page';

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

	const handleRetry = useCallback((): void => {
		if (isStreaming) {
			return;
		}
		void logEvent(AIAssistantEvents.RetryClicked, { threadId });
		void retryAssistantMessage(conversationId);
	}, [conversationId, isStreaming, retryAssistantMessage, threadId]);

	const showStreamingSlot =
		isStreaming || Boolean(pendingApproval) || Boolean(pendingClarification);
	const isEmptyState = messages.length === 0 && !showStreamingSlot;

	if (isEmptyState) {
		return (
			<EmptyState
				onSendSuggestedPrompt={onSendSuggestedPrompt}
				onSnakeGameChange={onSnakeGameChange}
			/>
		);
	}

	const totalCount = messages.length + (showStreamingSlot ? 1 : 0);
	const lastAssistantIndex = messages
		.map((m) => m.role)
		.lastIndexOf('assistant');

	return (
		<div className={styles.thread}>
			<Virtuoso
				ref={virtuosoRef}
				className={styles.messages}
				totalCount={totalCount}
				atBottomStateChange={setIsAtBottom}
				atBottomThreshold={64}
				// End-aligned: a short thread shows from its first message, a long one opens on the latest.
				initialTopMostItemIndex={{ index: 'LAST', align: 'end' }}
				increaseViewportBy={{ top: PRERENDER_ABOVE_PX, bottom: 0 }}
				itemContent={(index): JSX.Element => {
					const rowClass = cx(styles.row, {
						[styles.fullPage]: isFullPage,
						[styles.first]: index === 0,
						[styles.last]: index === totalCount - 1,
					});
					if (index < messages.length) {
						return (
							<MessageRow
								className={rowClass}
								message={messages[index]}
								isLastAssistant={index === lastAssistantIndex}
								canRegenerate={!showStreamingSlot}
								onRegenerate={handleRegenerate}
								onRetry={handleRetry}
							/>
						);
					}
					return (
						<StreamingRow
							className={rowClass}
							conversationId={conversationId}
							pendingApproval={pendingApproval}
							pendingClarification={pendingClarification}
						/>
					);
				}}
			/>
			{!isAtBottom && (
				<div className={styles.latest}>
					<Button
						variant="solid"
						color="secondary"
						size="sm"
						prefix={<ArrowDown size={14} />}
						onClick={jumpToLatest}
						testId="ai-assistant-latest"
					>
						<span className={cx({ [styles.latestStreaming]: isStreaming })}>
							Latest
						</span>
					</Button>
				</div>
			)}
		</div>
	);
}
