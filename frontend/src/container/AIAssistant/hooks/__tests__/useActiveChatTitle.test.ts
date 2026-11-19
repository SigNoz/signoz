import { renderHook } from 'tests/test-utils';

import { useAIAssistantStore } from '../../store/useAIAssistantStore';
import type { Conversation } from '../../types';
import { NEW_CHAT_TITLE, useActiveChatTitle } from '../useActiveChatTitle';

const initialState = useAIAssistantStore.getState();

const open = (conversation: Conversation): void => {
	useAIAssistantStore.setState({
		conversations: { [conversation.id]: conversation },
		activeConversationId: conversation.id,
	});
};

describe('useActiveChatTitle', () => {
	afterEach(() => {
		useAIAssistantStore.setState(initialState, true);
	});

	it('is the open chat’s title', () => {
		open({ id: 'a', title: 'Checkout p99', messages: [], createdAt: 0 });

		const { result } = renderHook(() => useActiveChatTitle());

		expect(result.current).toBe('Checkout p99');
	});

	it('is "New chat" until the chat has a title', () => {
		open({ id: 'a', messages: [], createdAt: 0 });

		const { result } = renderHook(() => useActiveChatTitle());

		expect(result.current).toBe(NEW_CHAT_TITLE);
	});

	it('is empty while a restored chat loads, rather than flashing "New chat"', () => {
		open({ id: 'a', messages: [], createdAt: 0, isHydrating: true });

		const { result } = renderHook(() => useActiveChatTitle());

		expect(result.current).toBeNull();
	});
});
