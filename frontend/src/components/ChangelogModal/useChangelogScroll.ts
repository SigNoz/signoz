import { useCallback, useEffect, useState } from 'react';

const SCROLL_STEP_PX = 600;
const MIN_OVERFLOW_PX = 24;
const BOTTOM_TOLERANCE_PX = 8;

interface UseChangelogScrollReturn {
	contentRef: (node: HTMLDivElement | null) => void;
	hasScroll: boolean;
	scrollForMore: () => void;
}

export function useChangelogScroll(): UseChangelogScrollReturn {
	const [content, setContent] = useState<HTMLElement | null>(null);
	const [hasScroll, setHasScroll] = useState(false);

	const checkScroll = useCallback((): void => {
		if (!content) {
			return;
		}
		const { scrollHeight, clientHeight, scrollTop } = content;
		const isAtBottom =
			scrollHeight - clientHeight - scrollTop <= BOTTOM_TOLERANCE_PX;
		setHasScroll(scrollHeight > clientHeight + MIN_OVERFLOW_PX && !isAtBottom);
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
			top: content.scrollTop + SCROLL_STEP_PX,
			behavior: 'smooth',
		});
	}, [content]);

	// The dialog body owns the scroll; a second scroller inside it shows two scrollbars.
	const contentRef = useCallback((node: HTMLDivElement | null): void => {
		setContent(node?.closest<HTMLElement>('[data-slot="dialog-body"]') ?? node);
	}, []);

	return { contentRef, hasScroll, scrollForMore };
}
