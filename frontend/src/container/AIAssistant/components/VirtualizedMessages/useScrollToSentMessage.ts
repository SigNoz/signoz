import { RefObject, useEffect, useRef } from 'react';
import { VirtuosoHandle } from 'react-virtuoso';

import { Message } from '../../types';

/** Brings the end of the thread into view when the user sends a message, and at no other time. */
export function useScrollToSentMessage(
	virtuosoRef: RefObject<VirtuosoHandle>,
	messages: Message[],
): void {
	const lastSentIdRef = useRef<string | null>(null);

	useEffect(() => {
		const lastMessage = messages[messages.length - 1];
		if (
			lastMessage?.role !== 'user' ||
			lastMessage.id === lastSentIdRef.current
		) {
			return;
		}
		lastSentIdRef.current = lastMessage.id;
		virtuosoRef.current?.scrollToIndex({ index: 'LAST', align: 'end' });
	}, [messages, virtuosoRef]);
}
