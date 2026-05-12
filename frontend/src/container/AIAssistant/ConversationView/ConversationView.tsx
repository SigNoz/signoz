import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import cx from 'classnames';

import ChatInput, { autoContextKey } from '../components/ChatInput';
import ConversationSkeleton from '../components/ConversationSkeleton';
import VirtualizedMessages from '../components/VirtualizedMessages';
import { getAutoContexts } from '../getAutoContexts';
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
			void sendMessage(text, attachments, contexts);
		},
		[sendMessage],
	);

	const handleCancel = useCallback(() => {
		cancelStream(conversationId);
	}, [cancelStream, conversationId]);

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
				conversationId={conversationId}
				messages={messages}
				isStreaming={isStreamingHere}
			/>
			{showDisclaimer && (
				<div className={disclaimerClass} role="note" aria-live="polite">
					SigNoz AI can make mistakes. Please double-check responses.
				</div>
			)}
			<div className={inputWrapperClass}>
				<ChatInput
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
