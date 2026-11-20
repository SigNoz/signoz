import { useCallback } from 'react';
import logEvent from 'api/common/logEvent';

import { AIAssistantEvents, AIAssistantOpenSource } from '../events';
import { useAIAssistantStore } from '../store/useAIAssistantStore';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Opens a chat picked from a history list; `source` tags the analytics event. */
export function useOpenConversation(
	source?: AIAssistantOpenSource,
): (conversationId: string) => void {
	const conversations = useAIAssistantStore((s) => s.conversations);
	const activeConversationId = useAIAssistantStore(
		(s) => s.activeConversationId,
	);
	const loadThread = useAIAssistantStore((s) => s.loadThread);
	const setActiveConversation = useAIAssistantStore(
		(s) => s.setActiveConversation,
	);

	return useCallback(
		(conversationId: string): void => {
			const conversation = conversations[conversationId];
			if (!conversation?.threadId) {
				setActiveConversation(conversationId);
				return;
			}
			// Picking the open chat again doesn't count as opening one.
			if (conversationId !== activeConversationId) {
				void logEvent(AIAssistantEvents.ThreadOpenedFromHistory, {
					threadId: conversation.threadId,
					threadAgeDays: Math.floor((Date.now() - conversation.createdAt) / DAY_MS),
					...(source && { source }),
				});
			}
			// Always from the server: refreshes the messages, retries a load that failed, and rejoins a running reply.
			void loadThread(conversation.threadId);
		},
		[
			activeConversationId,
			conversations,
			loadThread,
			setActiveConversation,
			source,
		],
	);
}
