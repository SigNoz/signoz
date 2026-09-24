import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import cx from 'classnames';

import logEvent from 'api/common/logEvent';

import ChatInput, { autoContextKey } from '../components/ChatInput';
import ConversationSkeleton from '../components/ConversationSkeleton';
import VirtualizedMessages from '../components/VirtualizedMessages';
import { AIAssistantEvents } from '../events';
import { getAutoContexts } from '../getAutoContexts';
import { useAIAssistantAnalyticsContext } from '../hooks/useAIAssistantAnalyticsContext';
import { useAIAssistantStore } from '../store/useAIAssistantStore';
import { MessageAttachment } from '../types';
import { MessageContext } from '../../../api/ai-assistant/chat';
import { useVariant } from '../VariantContext';

import styles from './ConversationView.module.scss';

interface ConversationViewProps {
	conversationId: string;
}

export default function ConversationView({
	conversationId,
}: ConversationViewProps): JSX.Element {
	const variant = useVariant();
	const isCompact = variant === 'panel';
	const location = useLocation();

	const conversation = useAIAssistantStore(
		(s) => s.conversations[conversationId],
	);
	const isStreamingHere = useAIAssistantStore(
		(s) => s.streams[conversationId]?.isStreaming ?? false,
	);
	const isLoadingThread = useAIAssistantStore((s) => s.isLoadingThread);
	const pendingApprovalHere = useAIAssistantStore(
		(s) => s.streams[conversationId]?.pendingApproval ?? null,
	);
	const pendingClarificationHere = useAIAssistantStore(
		(s) => s.streams[conversationId]?.pendingClarification ?? null,
	);
	const sendMessage = useAIAssistantStore((s) => s.sendMessage);
	const cancelStream = useAIAssistantStore((s) => s.cancelStream);
	const analyticsCtx = useAIAssistantAnalyticsContext(conversationId);

	// Auto-derived contexts come from the route the user is currently looking
	// at (dashboard detail, service metrics, an explorer, …). Skip when the
	// user is on the standalone AI Assistant page — there's no "underlying"
	// page context to attach. ChatInput renders these as chips and merges
	// them with the user's `@`-mention picks before invoking onSend.
	const allAutoContexts = useMemo(
		() =>
			variant === 'page'
				? []
				: getAutoContexts(location.pathname, location.search),
		[variant, location.pathname, location.search],
	);

	// User-dismissed auto-context entries. Reset whenever the URL changes —
	// dismissals are scoped to "this page", not the whole conversation.
	const [dismissedAutoKeys, setDismissedAutoKeys] = useState<Set<string>>(
		() => new Set(),
	);
	useEffect(() => {
		setDismissedAutoKeys(new Set());
	}, [location.pathname, location.search]);

	const autoContexts = useMemo(
		() =>
			allAutoContexts.filter((ctx) => !dismissedAutoKeys.has(autoContextKey(ctx))),
		[allAutoContexts, dismissedAutoKeys],
	);

	const handleDismissAutoContext = useCallback((key: string): void => {
		setDismissedAutoKeys((prev) => {
			const next = new Set(prev);
			next.add(key);
			return next;
		});
	}, []);

	const handleSend = useCallback(
		(
			text: string,
			attachments?: MessageAttachment[],
			contexts?: MessageContext[],
		) => {
			const hasAuto = contexts?.some((c) => c.source === 'auto') ?? false;
			const hasManual = contexts?.some((c) => c.source === 'mention') ?? false;
			let contextType: 'manual' | 'auto' | 'both' | undefined;
			if (hasAuto && hasManual) {
				contextType = 'both';
			} else if (hasAuto) {
				contextType = 'auto';
			} else if (hasManual) {
				contextType = 'manual';
			}
			void logEvent(AIAssistantEvents.MessageSent, {
				...analyticsCtx,
				queryLength: text.length,
				hasContext: hasAuto || hasManual,
				contextType,
				respondingToClarification: Boolean(pendingClarificationHere),
			});
			void sendMessage(text, attachments, contexts);
		},
		[sendMessage, analyticsCtx, pendingClarificationHere],
	);

	// Wall-clock timestamp of the current streaming start, used to compute
	// `secondsSinceStart` on Cancel clicked. Cleared whenever streaming ends.
	const streamStartedAtRef = useRef<number | null>(null);
	useEffect(() => {
		if (!isStreamingHere) {
			streamStartedAtRef.current = null;
			return;
		}
		if (streamStartedAtRef.current === null) {
			streamStartedAtRef.current = Date.now();
		}
	}, [isStreamingHere]);

	const handleCancel = useCallback(() => {
		const startedAt = streamStartedAtRef.current;
		void logEvent(AIAssistantEvents.CancelClicked, {
			threadId: analyticsCtx.threadId,
			secondsSinceStart:
				startedAt !== null ? Math.round((Date.now() - startedAt) / 1000) : null,
		});
		cancelStream(conversationId);
	}, [cancelStream, conversationId, analyticsCtx.threadId]);

	const messages = conversation?.messages ?? [];
	const showDisclaimer = messages.length > 0;
	const inputDisabled =
		isStreamingHere ||
		isLoadingThread ||
		Boolean(pendingApprovalHere) ||
		Boolean(pendingClarificationHere);

	const inputWrapperClass = cx(styles.inputWrapper, {
		[styles.compact]: isCompact,
	});
	const disclaimerClass = cx(styles.disclaimer, {
		[styles.compact]: isCompact,
	});

	// Cover the gap between rehydrate (empty primed entry) and the first
	// loadThread response. `isHydrating` is set on the rehydrated conversation
	// and cleared once fetchThreads resolves; `isLoadingThread` covers the
	// per-thread fetch that follows. Together they keep the skeleton visible
	// for persisted chats without flashing it on freshly-created ones.
	const isHydrating = Boolean(conversation?.isHydrating);
	if ((isLoadingThread || isHydrating) && messages.length === 0) {
		return (
			<div className={styles.conversation}>
				<ConversationSkeleton />
				<div className={inputWrapperClass}>
					<ChatInput
						key={conversationId}
						onSend={handleSend}
						disabled
						autoContexts={autoContexts}
						onDismissAutoContext={handleDismissAutoContext}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.conversation}>
			<VirtualizedMessages
				key={conversationId}
				conversationId={conversationId}
				messages={messages}
				isStreaming={isStreamingHere}
				onSendSuggestedPrompt={(text): void => {
					handleSend(
						text,
						undefined,
						autoContexts.length > 0 ? autoContexts : undefined,
					);
				}}
			/>
			{showDisclaimer && (
				<div className={disclaimerClass} role="note" aria-live="polite">
					SigNoz AI can make mistakes. Please double-check responses.
				</div>
			)}
			<div className={inputWrapperClass}>
				<ChatInput
					key={conversationId}
					onSend={handleSend}
					onCancel={handleCancel}
					disabled={inputDisabled}
					isStreaming={isStreamingHere}
					autoContexts={autoContexts}
					onDismissAutoContext={handleDismissAutoContext}
				/>
			</div>
		</div>
	);
}
