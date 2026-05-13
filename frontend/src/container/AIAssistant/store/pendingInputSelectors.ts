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
