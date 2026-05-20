import { matchPath, useLocation } from 'react-router-dom';

import ROUTES from 'constants/routes';

import { useAIAssistantStore } from '../store/useAIAssistantStore';
import { useVariant } from '../VariantContext';

export interface AIAssistantAnalyticsContext {
	/** Backend thread ID for the resolved conversation; undefined before the first send. */
	threadId: string | undefined;
	/**
	 * Normalised route template for the current page (e.g. `/dashboard/:dashboardId`).
	 * Falls back to the raw pathname for routes not in ROUTES. We normalise to keep
	 * analytics cardinality bounded and avoid leaking customer identifiers
	 * (dashboard IDs, service names, trace IDs, conversation IDs) into the event.
	 */
	page: string;
	/** Surface the assistant is rendered on. `panel` / `modal` collapse to `sidepane`. */
	mode: 'sidepane' | 'full_screen';
}

// Pre-sorted longest-first so more specific templates match before their
// less specific siblings (e.g. `/services/:s/top-level-operations` wins
// over `/services/:s`). Module-level — ROUTES is static.
const ROUTE_TEMPLATES = Object.values(ROUTES).sort(
	(a, b) => b.length - a.length,
);

export function normalizePage(pathname: string): string {
	for (const template of ROUTE_TEMPLATES) {
		if (matchPath(pathname, { path: template, exact: true })) {
			return template;
		}
	}
	return pathname;
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
		page: normalizePage(pathname),
		mode: variant === 'page' ? 'full_screen' : 'sidepane',
	};
}
