import { useCallback, useEffect, useState } from 'react';

interface UseChangelogScrollResult {
	contentRef: (node: HTMLDivElement | null) => void;
	hasScroll: boolean;
	scrollForMore: () => void;
}

export function useChangelogScroll(): UseChangelogScrollResult {
	const [content, setContent] = useState<HTMLElement | null>(null);
	const [hasScroll, setHasScroll] = useState(false);

	const checkScroll = useCallback((): void => {
		if (!content) {
			return;
		}
		const { scrollHeight, clientHeight, scrollTop } = content;
		const isAtBottom = scrollHeight - clientHeight - scrollTop <= 8;
		setHasScroll(scrollHeight > clientHeight + 24 && !isAtBottom); // 24px - buffer height to show show more
	}, [content]);

	useEffect(() => {
		if (!content) {
			return undefined;
		}
		checkScroll();
		content.addEventListener('scroll', checkScroll);

		return (): void => {
			content.removeEventListener('scroll', checkScroll);
		};
	}, [content, checkScroll]);

	const scrollForMore = useCallback((): void => {
		content?.scrollTo({
			top: content.scrollTop + 600, // Scroll 600px from the current position
			behavior: 'smooth',
		});
	}, [content]);

	// The dialog body owns the scroll; a second scroller inside it shows two scrollbars.
	const contentRef = useCallback((node: HTMLDivElement | null): void => {
		setContent(node?.closest<HTMLElement>('[data-slot="dialog-body"]') ?? node);
	}, []);

	return { contentRef, hasScroll, scrollForMore };
}
