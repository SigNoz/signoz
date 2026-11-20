import { useAIAssistantStore } from '../store/useAIAssistantStore';

export const NEW_CHAT_TITLE = 'New chat';

/** The open chat's title for a header: "New chat" until it has one, null while a restored chat loads. */
export function useActiveChatTitle(): string | null {
	return useAIAssistantStore((s) => {
		const conversation = s.activeConversationId
			? s.conversations[s.activeConversationId]
			: undefined;
		if (conversation?.title) {
			return conversation.title;
		}
		return conversation?.isHydrating ? null : NEW_CHAT_TITLE;
	});
}
