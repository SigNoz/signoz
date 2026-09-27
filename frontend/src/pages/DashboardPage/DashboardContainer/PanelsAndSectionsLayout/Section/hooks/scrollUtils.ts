/** Nearest ancestor that scrolls vertically, falling back to the document scroller. */
export function getScrollParent(element: HTMLElement): HTMLElement {
	let node = element.parentElement;
	while (node) {
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
