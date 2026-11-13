import getLocalStorageKey from 'api/browser/localstorage/get';
import removeLocalStorageKey from 'api/browser/localstorage/remove';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { useAIAssistantStore } from 'container/AIAssistant/store/useAIAssistantStore';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const MAX_OPEN_CONVERSATIONS = 5;
export const NOZ_OPEN_CONVERSATIONS_STORAGE_KEY = 'nozOpenConversations';

interface NozOpenConversationsState {
	/** Thread ids of the open tabs, oldest first. */
	threadIds: string[];
	/** Past the cap, drops the oldest tab with no unseen reply or running stream, else the oldest. */
	open: (threadId: string) => void;
	close: (threadId: string) => void;
	prune: (staleThreadIds: readonly string[]) => void;
}

function isBusy(threadId: string): boolean {
	const { conversations, unreadReplyIds, streams } =
		useAIAssistantStore.getState();
	const conversation = Object.values(conversations).find(
		(c) => c.threadId === threadId,
	);
	return Boolean(
		conversation &&
		(unreadReplyIds.includes(conversation.id) || streams[conversation.id]),
	);
}

export const useNozOpenConversationsStore = create<NozOpenConversationsState>()(
	persist(
		(set, get) => ({
			threadIds: [],

			open: (threadId): void => {
				const { threadIds } = get();
				// Every set() writes storage, so skip the no-op.
				if (threadIds.includes(threadId)) {
					return;
				}
				const next = [...threadIds, threadId];
				if (next.length <= MAX_OPEN_CONVERSATIONS) {
					set({ threadIds: next });
					return;
				}
				const evicted =
					next.find((id) => id !== threadId && !isBusy(id)) ?? next[0];
				set({ threadIds: next.filter((id) => id !== evicted) });
			},

			close: (threadId): void => {
				set({ threadIds: get().threadIds.filter((id) => id !== threadId) });
			},

			prune: (staleThreadIds): void => {
				set({
					threadIds: get().threadIds.filter((id) => !staleThreadIds.includes(id)),
				});
			},
		}),
		{
			name: NOZ_OPEN_CONVERSATIONS_STORAGE_KEY,
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
				const stored = (persisted as Partial<NozOpenConversationsState> | null)
					?.threadIds;
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
