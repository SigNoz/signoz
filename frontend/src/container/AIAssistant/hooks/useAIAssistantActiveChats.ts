import { useCallback, useEffect, useMemo, useRef } from 'react';
import replySoundUrl from 'assets/sounds/noz-reply.wav';

import { useAIAssistantOpenConversationsStore } from '../store/useAIAssistantOpenConversationsStore';
import {
	openAIAssistant,
	useAIAssistantStore,
} from '../store/useAIAssistantStore';
import type { Conversation } from '../types';

export interface AIAssistantChatTab {
	threadId: string;
	title: string | undefined;
	hasUnreadReply: boolean;
	isActive: boolean;
}

interface UseAIAssistantActiveChatsResult {
	chats: AIAssistantChatTab[];
	openChat: (threadId: string) => void;
	closeChat: (threadId: string) => void;
}

/**
 * Open Noz conversations for the strip, kept in localStorage by thread id.
 * A chat joins when it becomes active in the drawer or modal, or when a reply
 * lands in it; it leaves on close, archive, clear, or once the server no
 * longer lists it.
 */
export function useAIAssistantActiveChats(): UseAIAssistantActiveChatsResult {
	const threadIds = useAIAssistantOpenConversationsStore((s) => s.threadIds);
	const openTab = useAIAssistantOpenConversationsStore((s) => s.open);
	const closeTab = useAIAssistantOpenConversationsStore((s) => s.close);
	const pruneTabs = useAIAssistantOpenConversationsStore((s) => s.prune);

	const conversations = useAIAssistantStore((s) => s.conversations);
	const unreadReplyIds = useAIAssistantStore((s) => s.unreadReplyIds);
	const activeConversationId = useAIAssistantStore(
		(s) => s.activeConversationId,
	);
	const isAssistantOpen = useAIAssistantStore(
		(s) => s.isDrawerOpen || s.isModalOpen,
	);
	const hasLoadedThreads = useAIAssistantStore((s) => s.hasLoadedThreads);
	const setActiveConversation = useAIAssistantStore(
		(s) => s.setActiveConversation,
	);
	const loadThread = useAIAssistantStore((s) => s.loadThread);
	const loadingThreadIds = useAIAssistantStore((s) => s.loadingThreadIds);
	const markReplyRead = useAIAssistantStore((s) => s.markReplyRead);

	// A new chat keeps its local id after the server assigns a thread id.
	const conversationByThreadId = useMemo(() => {
		const byThreadId = new Map<string, Conversation>();
		Object.values(conversations).forEach((conversation) => {
			if (conversation.threadId) {
				byThreadId.set(conversation.threadId, conversation);
			}
		});
		return byThreadId;
	}, [conversations]);

	const activeThreadId = activeConversationId
		? conversations[activeConversationId]?.threadId
		: undefined;

	useEffect(() => {
		if (isAssistantOpen && activeThreadId) {
			openTab(activeThreadId);
		}
	}, [isAssistantOpen, activeThreadId, openTab]);

	// Each unread reply opens its tab once; one restored before the threads load opens when they do.
	const openedForUnreadRef = useRef<readonly string[]>([]);
	useEffect(() => {
		const opened = openedForUnreadRef.current.filter((id) =>
			unreadReplyIds.includes(id),
		);
		unreadReplyIds.forEach((conversationId) => {
			const threadId = conversations[conversationId]?.threadId;
			if (threadId && !opened.includes(conversationId)) {
				openTab(threadId);
				opened.push(conversationId);
			}
		});
		openedForUnreadRef.current = opened;
	}, [unreadReplyIds, conversations, openTab]);

	const previousUnreadReplyIdsRef = useRef(unreadReplyIds);
	const replySoundRef = useRef<HTMLAudioElement | null>(null);
	useEffect(() => {
		const previousIds = previousUnreadReplyIdsRef.current;
		previousUnreadReplyIdsRef.current = unreadReplyIds;
		if (unreadReplyIds.every((id) => previousIds.includes(id))) {
			return undefined;
		}

		// A chat on screen reads its reply in the same task, which re-runs this effect and cancels the chime.
		const timer = window.setTimeout(() => {
			replySoundRef.current ??= new Audio(replySoundUrl);
			replySoundRef.current.currentTime = 0;
			// Autoplay policy rejects play() until the user has interacted with the page.
			replySoundRef.current.play().catch(() => undefined);
		}, 0);

		return (): void => window.clearTimeout(timer);
	}, [unreadReplyIds]);

	// Before the first successful fetch, a missing thread may only be unloaded.
	useEffect(() => {
		const staleThreadIds = threadIds.filter((threadId) => {
			const conversation = conversationByThreadId.get(threadId);
			return conversation ? Boolean(conversation.archived) : hasLoadedThreads;
		});
		if (staleThreadIds.length > 0) {
			pruneTabs(staleThreadIds);
		}
	}, [threadIds, conversationByThreadId, hasLoadedThreads, pruneTabs]);

	const chats = useMemo(
		() =>
			threadIds.flatMap((threadId): AIAssistantChatTab[] => {
				const conversation = conversationByThreadId.get(threadId);
				if (!conversation || conversation.archived) {
					return [];
				}
				return [
					{
						threadId,
						title: conversation.title,
						hasUnreadReply: unreadReplyIds.includes(conversation.id),
						isActive: isAssistantOpen && activeConversationId === conversation.id,
					},
				];
			}),
		[
			threadIds,
			conversationByThreadId,
			unreadReplyIds,
			isAssistantOpen,
			activeConversationId,
		],
	);

	const openChat = useCallback(
		(threadId: string): void => {
			const conversation = conversationByThreadId.get(threadId);
			if (!conversation) {
				return;
			}
			// After a reload only the thread list is loaded; an empty chat loads, even when selected, so a failed load retries.
			const needsLoad =
				conversation.messages.length === 0 && !loadingThreadIds.includes(threadId);
			if (needsLoad) {
				void loadThread(threadId);
			} else if (conversation.id !== activeConversationId) {
				setActiveConversation(conversation.id);
			}
			openAIAssistant();
		},
		[
			conversationByThreadId,
			activeConversationId,
			loadingThreadIds,
			loadThread,
			setActiveConversation,
		],
	);

	// Closing dismisses the unseen reply too, or the reply would reopen the tab.
	const closeChat = useCallback(
		(threadId: string): void => {
			closeTab(threadId);
			const conversation = conversationByThreadId.get(threadId);
			if (conversation && unreadReplyIds.includes(conversation.id)) {
				markReplyRead(conversation.id);
			}
		},
		[closeTab, conversationByThreadId, unreadReplyIds, markReplyRead],
	);

	return { chats, openChat, closeChat };
}
