import type { AIAssistantStore } from './useAIAssistantStore';

export type AIAssistantStoreState = AIAssistantStore;

/**
 * Number of conversations whose execution is waiting on the user (approval or
 * clarification). Used for header badges when the side panel is closed.
 */
export function selectPendingUserInputStreamCount(
	state: AIAssistantStoreState,
): number {
	let n = 0;
	for (const st of Object.values(state.streams)) {
		const { streamingStatus } = st;
		if (
			streamingStatus === 'awaiting_approval' ||
			streamingStatus === 'awaiting_clarification'
		) {
			n += 1;
		}
	}
	return n;
}

/** Thread ids of the saved chats whose execution is waiting on the user. */
export function selectAwaitingUserThreadIds(
	state: AIAssistantStoreState,
): string[] {
	return Object.entries(state.streams).flatMap(
		([conversationId, { streamingStatus }]) => {
			const threadId = state.conversations[conversationId]?.threadId;
			const isAwaiting =
				streamingStatus === 'awaiting_approval' ||
				streamingStatus === 'awaiting_clarification';
			return threadId && isAwaiting ? [threadId] : [];
		},
	);
}
