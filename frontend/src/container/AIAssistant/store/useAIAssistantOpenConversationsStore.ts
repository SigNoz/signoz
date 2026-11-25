import getLocalStorageKey from 'api/browser/localstorage/get';
import removeLocalStorageKey from 'api/browser/localstorage/remove';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const MAX_OPEN_CONVERSATIONS = 5;
export const AI_ASSISTANT_OPEN_CONVERSATIONS_STORAGE_KEY =
	'aiAssistantOpenConversations';

interface AIAssistantOpenConversationsState {
	/** Thread ids of the open tabs, oldest first. */
	threadIds: string[];
	/** Waiting chats already given a tab. Not saved: the waiting state is lost on reload too. */
	seenAwaitingThreadIds: readonly string[];
	/** Past the cap, drops the oldest tab. */
	open: (threadId: string) => void;
	close: (threadId: string) => void;
	prune: (staleThreadIds: readonly string[]) => void;
	/** Opens a tab only for a chat that started waiting since the last call. */
	openNewlyAwaiting: (awaitingThreadIds: readonly string[]) => void;
}

export const useAIAssistantOpenConversationsStore =
	create<AIAssistantOpenConversationsState>()(
		persist(
			(set, get) => ({
				threadIds: [],
				seenAwaitingThreadIds: [],

				open: (threadId): void => {
					const { threadIds } = get();
					// Every set() writes storage, so skip the no-op.
					if (threadIds.includes(threadId)) {
						return;
					}
					set({
						threadIds: [...threadIds, threadId].slice(-MAX_OPEN_CONVERSATIONS),
					});
				},

				close: (threadId): void => {
					set({ threadIds: get().threadIds.filter((id) => id !== threadId) });
				},

				prune: (staleThreadIds): void => {
					set({
						threadIds: get().threadIds.filter((id) => !staleThreadIds.includes(id)),
					});
				},

				openNewlyAwaiting: (awaitingThreadIds): void => {
					const { seenAwaitingThreadIds, open } = get();
					awaitingThreadIds
						.filter((threadId) => !seenAwaitingThreadIds.includes(threadId))
						.forEach((threadId) => open(threadId));
					set({ seenAwaitingThreadIds: awaitingThreadIds });
				},
			}),
			{
				name: AI_ASSISTANT_OPEN_CONVERSATIONS_STORAGE_KEY,
				version: 1,
				// Scoped wrappers prefix the key when SigNoz is served under a base path.
				storage: createJSONStorage(() => ({
					getItem: getLocalStorageKey,
					setItem: setLocalStorageKey,
					removeItem: removeLocalStorageKey,
				})),
				partialize: (state) => ({ threadIds: state.threadIds }),
				// Storage is user-editable: keep only string ids, newest within the cap.
				merge: (persisted, current) => {
					const stored = (
						persisted as Partial<AIAssistantOpenConversationsState> | null
					)?.threadIds;
					return {
						...current,
						threadIds: Array.isArray(stored)
							? stored
									.filter((id): id is string => typeof id === 'string')
									.slice(-MAX_OPEN_CONVERSATIONS)
							: [],
					};
				},
			},
		),
	);
