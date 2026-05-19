import { useCallback, useEffect, useRef } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';

import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';

import ConversationView from 'container/AIAssistant/ConversationView';
import { AIAssistantEvents } from 'container/AIAssistant/events';
import { normalizePage } from 'container/AIAssistant/hooks/useAIAssistantAnalyticsContext';
import { useAIAssistantStore } from 'container/AIAssistant/store/useAIAssistantStore';
import { VariantContext } from 'container/AIAssistant/VariantContext';
import { Sparkles } from '@signozhq/icons';

import styles from './AIAssistantPage.module.scss';
import ConversationsList from 'container/AIAssistant/components/ConversationsList';

interface RouteParams {
	conversationId: string;
}

export default function AIAssistantPage(): JSX.Element {
	const history = useHistory();
	const location = useLocation<{ fromInApp?: boolean } | undefined>();
	const { pathname } = location;
	const { conversationId } = useParams<RouteParams>();

	// Skip the mount-time Opened fire when the user expanded an already-open
	// drawer/modal — that surface already emitted Opened with the right source.
	// Router state (vs a module flag) survives StrictMode double-mount and
	// aborted navigations.
	const fromInApp = location.state?.fromInApp === true;
	useEffect(() => {
		if (fromInApp) {
			return;
		}
		void logEvent(AIAssistantEvents.Opened, {
			source: 'deeplink',
			currentPage: normalizePage(pathname),
		});
		// Only on mount; route param changes inside the same page aren't a re-open.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const conversations = useAIAssistantStore((s) => s.conversations);
	const activeConversationId = useAIAssistantStore(
		(s) => s.activeConversationId,
	);
	const setActiveConversation = useAIAssistantStore(
		(s) => s.setActiveConversation,
	);
	const startNewConversation = useAIAssistantStore(
		(s) => s.startNewConversation,
	);

	// Keep a ref so the effect can read latest conversations without re-firing
	// when startNewConversation mutates the store mid-effect.
	const conversationsRef = useRef(conversations);
	conversationsRef.current = conversations;

	useEffect(() => {
		if (conversationsRef.current[conversationId]) {
			setActiveConversation(conversationId);
		} else {
			const newId = startNewConversation();
			history.replace(ROUTES.AI_ASSISTANT.replace(':conversationId', newId));
		}
		// Only re-run when the URL param changes, not when conversations mutates.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [conversationId]);

	// Keep the URL in lock-step with `activeConversationId`. The first send on a
	// new conversation re-keys the store entry from the local client UUID to the
	// backend threadId; without this sync the URL would still point at the now-
	// deleted client UUID, leaving `<ConversationView>` unmounted until reload.
	useEffect(() => {
		if (
			activeConversationId &&
			activeConversationId !== conversationId &&
			conversations[activeConversationId]
		) {
			history.replace(
				ROUTES.AI_ASSISTANT.replace(':conversationId', activeConversationId),
			);
		}
	}, [activeConversationId, conversationId, conversations, history]);

	// When conversations sidebar selects a thread, navigate to it
	const handleHistorySelect = useCallback(
		(id: string) => {
			history.push(ROUTES.AI_ASSISTANT.replace(':conversationId', id));
		},
		[history],
	);

	const handleNewConversation = useCallback(() => {
		void logEvent(AIAssistantEvents.NewChatClicked, {
			page: normalizePage(pathname),
			mode: 'full_screen',
			source: 'history_list',
		});
		const newId = startNewConversation();
		history.push(ROUTES.AI_ASSISTANT.replace(':conversationId', newId));
	}, [startNewConversation, history, pathname]);

	// Prefer the URL param, but fall back to the store's `activeConversationId`
	// for the brief render after a re-key (client UUID → backend threadId), so
	// the chat doesn't unmount while the URL sync effect catches up.
	let activeId: string | null = null;
	if (conversations[conversationId]) {
		activeId = conversationId;
	} else if (activeConversationId && conversations[activeConversationId]) {
		activeId = activeConversationId;
	}

	return (
		<VariantContext.Provider value="page">
			<div className={styles.page}>
				<div className={styles.header}>
					<div className={styles.title}>
						<Sparkles size={16} color="var(--primary)" />
						<span>AI Assistant</span>
					</div>
				</div>

				<div className={styles.body}>
					<ConversationsList
						onSelect={handleHistorySelect}
						onNewConversation={handleNewConversation}
						showAddNewConversation
					/>

					<div className={styles.chat}>
						{activeId && <ConversationView conversationId={activeId} />}
					</div>
				</div>
			</div>
		</VariantContext.Provider>
	);
}
