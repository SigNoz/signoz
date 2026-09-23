import { useCallback, useEffect, useRef } from 'react';

import logEvent from 'api/common/logEvent';
import { useAppLocation } from 'lib/router/useAppLocation';
import { useAppParams } from 'lib/router/useAppParams';
import { navigate } from 'lib/router/navigation';
import ROUTES from 'constants/routes';

import ConversationView from 'container/AIAssistant/ConversationView';
import { AIAssistantEvents } from 'container/AIAssistant/events';
import { normalizePage } from 'container/AIAssistant/hooks/useAIAssistantAnalyticsContext';
import { useAIAssistantStore } from 'container/AIAssistant/store/useAIAssistantStore';
import { VariantContext } from 'container/AIAssistant/VariantContext';
import Noz from 'components/Noz/Noz';

import styles from './AIAssistantPage.module.scss';
import ConversationsList from 'container/AIAssistant/components/ConversationsList';

export default function AIAssistantPage(): JSX.Element {
	const location = useAppLocation<{ fromInApp?: boolean } | undefined>();
	const { pathname } = location;
	const { conversationId } = useAppParams<'conversationId'>();

	// Skip the mount-time Opened fire when the user expanded an already-open
	// drawer/modal — that surface already emitted Opened with the right source.
	// Router state (vs a module flag) survives page remounts and aborted
	// navigations.
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

	// Keep refs so the effect can read the latest store state without re-firing
	// when it mutates the store mid-effect (it only depends on the URL param).
	const conversationsRef = useRef(conversations);
	conversationsRef.current = conversations;
	const activeConversationIdRef = useRef(activeConversationId);
	activeConversationIdRef.current = activeConversationId;

	useEffect(() => {
		// URL points at a known conversation → just activate it.
		if (conversationId && conversationsRef.current[conversationId]) {
			setActiveConversation(conversationId);
			return;
		}

		// The URL has no usable conversation id (bare `/ai-assistant`, or a stale
		// param). Prefer resuming the active conversation — including the
		// rehydrating placeholder for the persisted thread — over minting a new
		// one. This is what stops a throwaway blank chat from flashing as a
		// second thread during load, and stops a duplicate when the page
		// remounts during startup route churn (the active id is already set, so
		// we resume instead of create). Starting fresh is the last resort, only
		// when there is genuinely nothing to resume.
		const activeId = activeConversationIdRef.current;
		const resumeId =
			activeId && conversationsRef.current[activeId]
				? activeId
				: startNewConversation();
		navigate(ROUTES.AI_ASSISTANT.replace(':conversationId', resumeId), {
			replace: true,
		});
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
			navigate(
				ROUTES.AI_ASSISTANT.replace(':conversationId', activeConversationId),
				{ replace: true },
			);
		}
	}, [activeConversationId, conversationId, conversations]);

	// When conversations sidebar selects a thread, navigate to it
	const handleHistorySelect = useCallback((id: string) => {
		navigate(ROUTES.AI_ASSISTANT.replace(':conversationId', id));
	}, []);

	const handleNewConversation = useCallback(() => {
		void logEvent(AIAssistantEvents.NewChatClicked, {
			page: normalizePage(pathname),
			mode: 'full_screen',
			source: 'history_list',
		});
		const newId = startNewConversation();
		navigate(ROUTES.AI_ASSISTANT.replace(':conversationId', newId));
	}, [startNewConversation, pathname]);

	// Prefer the URL param, but fall back to the store's `activeConversationId`
	// for the brief render after a re-key (client UUID → backend threadId), so
	// the chat doesn't unmount while the URL sync effect catches up.
	let activeId: string | null = null;
	if (conversationId && conversations[conversationId]) {
		activeId = conversationId;
	} else if (activeConversationId && conversations[activeConversationId]) {
		activeId = activeConversationId;
	}

	return (
		<VariantContext.Provider value="page">
			<div className={styles.page}>
				<div className={styles.header}>
					<div className={`${styles.title} noz-wave`}>
						<Noz size={18} />
						<span>Noz</span>
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
