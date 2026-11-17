import { useCallback, useEffect, useMemo } from 'react';
import {
	openAIAssistant,
	useAIAssistantStore,
} from 'container/AIAssistant/store/useAIAssistantStore';
import type { Conversation } from 'container/AIAssistant/types';

import { useNozOpenConversationsStore } from './store/useNozOpenConversationsStore';

export interface NozChatTab {
	threadId: string;
	title: string | undefined;
	hasUnreadReply: boolean;
	isActive: boolean;
}

interface UseNozActiveChatsResult {
	chats: NozChatTab[];
	openChat: (threadId: string) => void;
	closeChat: (threadId: string) => void;
}

/**
 * Open Noz conversations for the strip, kept in localStorage by thread id.
 * A chat joins when it becomes active in the drawer or modal, or when a reply
 * lands in it; it leaves on close, archive, clear, or once the server no
 * longer lists it.
 */
export function useNozActiveChats(): UseNozActiveChatsResult {
	const threadIds = useNozOpenConversationsStore((s) => s.threadIds);
	const openTab = useNozOpenConversationsStore((s) => s.open);
	const closeTab = useNozOpenConversationsStore((s) => s.close);
	const pruneTabs = useNozOpenConversationsStore((s) => s.prune);

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

	useEffect(() => {
		unreadReplyIds.forEach((conversationId) => {
			const threadId = conversations[conversationId]?.threadId;
			if (threadId) {
				openTab(threadId);
			}
		});
	}, [unreadReplyIds, conversations, openTab]);

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
			threadIds.flatMap((threadId): NozChatTab[] => {
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
			if (conversation.id !== activeConversationId) {
				// After a reload only the thread list is loaded, not its messages.
				if (conversation.messages.length === 0) {
					void loadThread(threadId);
				} else {
					setActiveConversation(conversation.id);
				}
			}
			openAIAssistant();
		},
		[
			conversationByThreadId,
			activeConversationId,
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
