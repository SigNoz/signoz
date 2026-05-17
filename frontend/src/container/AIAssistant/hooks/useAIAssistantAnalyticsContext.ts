import { useLocation } from 'react-router-dom';

import { useAIAssistantStore } from '../store/useAIAssistantStore';
import { useVariant } from '../VariantContext';

export interface AIAssistantAnalyticsContext {
	/** Backend thread ID for the resolved conversation; undefined before the first send. */
	threadId: string | undefined;
	/** Current router pathname — used as the `page` attribute on AI Assistant events. */
	page: string;
	/** Surface the assistant is rendered on. `panel` / `modal` collapse to `sidepane`. */
	mode: 'sidepane' | 'full_screen';
}

/**
 * Shared base attributes for AI Assistant analytics events (Message sent,
 * Cancel clicked, Feedback submitted, Resource/Doc/Apply filter, …).
 *
 * Pass `conversationId` when the caller is scoped to a specific
 * conversation (e.g. `ClarificationForm`, `VirtualizedMessages`); omit
 * to fall back to the store's active conversation.
 */
export function useAIAssistantAnalyticsContext(
	conversationId?: string,
): AIAssistantAnalyticsContext {
	const { pathname } = useLocation();
	const variant = useVariant();
	const threadId = useAIAssistantStore((s) => {
		const id = conversationId ?? s.activeConversationId;
		return id ? s.conversations[id]?.threadId : undefined;
	});
	return {
		threadId,
		page: pathname,
		mode: variant === 'page' ? 'full_screen' : 'sidepane',
	};
}
