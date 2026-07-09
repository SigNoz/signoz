/**
 * Polls via rAF until `resolveTarget` returns an element, then scrolls it into
 * view — for nodes that mount a frame or two after the call (e.g. an optimistic
 * write). Return `null`/`undefined` while not ready; bails after `attempts`.
 */
export function scrollIntoViewWhenReady(
	resolveTarget: () => Element | null | undefined,
	attempts = 40,
): void {
	const target = resolveTarget();
	if (target) {
		target.scrollIntoView({ behavior: 'smooth', block: 'center' });
		return;
	}
	if (attempts > 0) {
		requestAnimationFrame(() =>
			scrollIntoViewWhenReady(resolveTarget, attempts - 1),
		);
	}
}
