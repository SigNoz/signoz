import { useEffect, useLayoutEffect, useRef } from 'react';
import replySoundUrl from 'assets/sounds/noz-reply.wav';
import { useAIAssistantStore } from 'container/AIAssistant/store/useAIAssistantStore';

/** Chimes when a Noz reply lands in a conversation that isn't on screen. */
export function useNozReplySound(): void {
	const unreadReplyIds = useAIAssistantStore((s) => s.unreadReplyIds);
	const previousIdsRef = useRef(unreadReplyIds);
	const latestIdsRef = useRef(unreadReplyIds);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	useLayoutEffect(() => {
		latestIdsRef.current = unreadReplyIds;
	}, [unreadReplyIds]);

	useEffect(() => {
		const previousIds = previousIdsRef.current;
		previousIdsRef.current = unreadReplyIds;
		const newIds = unreadReplyIds.filter((id) => !previousIds.includes(id));
		if (newIds.length === 0) {
			return undefined;
		}

		// ConversationView clears an on-screen reply within the same task; check after it.
		const timer = window.setTimeout(() => {
			if (!newIds.some((id) => latestIdsRef.current.includes(id))) {
				return;
			}
			audioRef.current ??= new Audio(replySoundUrl);
			audioRef.current.currentTime = 0;
			// Autoplay policy rejects play() until the user has interacted with the page.
			audioRef.current.play().catch(() => undefined);
		}, 0);

		return (): void => window.clearTimeout(timer);
	}, [unreadReplyIds]);
}
