/** Nearest ancestor that scrolls vertically, falling back to the document scroller. */
export function getScrollParent(element: HTMLElement): HTMLElement {
	let node = element.parentElement;
	while (node) {
		// OverlayScrollbars marks its viewport scrollable only after it notices new overflow.
		if (node.hasAttribute('data-overlayscrollbars-viewport')) {
			return node;
		}
		const { overflowY } = getComputedStyle(node);
		if (
			(overflowY === 'auto' || overflowY === 'scroll') &&
			node.scrollHeight > node.clientHeight
		) {
			return node;
		}
		node = node.parentElement;
	}
	return (document.scrollingElement as HTMLElement) ?? document.documentElement;
}

/** `scrollTop` for `scroller` that centers `element` vertically in its visible area. */
export function centeredScrollTop(
	scroller: HTMLElement,
	element: HTMLElement,
): number {
	const isDocument = scroller === document.scrollingElement;
	const viewTop = isDocument ? 0 : scroller.getBoundingClientRect().top;
	const viewHeight = isDocument ? window.innerHeight : scroller.clientHeight;
	const rect = element.getBoundingClientRect();
	return (
		scroller.scrollTop + rect.top - viewTop - (viewHeight - rect.height) / 2
	);
}
