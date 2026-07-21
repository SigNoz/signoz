import { OverlayScrollbars } from 'overlayscrollbars';

/**
 * Disables the content `elementEvents` option (default: `[['img', 'load']]`)
 * for every OverlayScrollbars instance.
 *
 * The per-element event cleanups OverlayScrollbars stores in its internal
 * WeakMap close over the MutationObserver callback scope, which holds arrays
 * with every node added/removed in that mutation batch. A single long-lived
 * reference to one of those elements (e.g. CodeMirror's EditContext or its
 * module-level scratch Range pinning a detached editor) then retains entire
 * unmounted subtrees as detached DOM — ~1.3k nodes per InfraMonitoring
 * category switch.
 *
 * Content size changes from loading images are still handled by the
 * scrollbars' size observer, so scrollbar geometry stays correct.
 */
export function configureOverlayScrollbars(): void {
	OverlayScrollbars.env().setDefaultOptions({
		update: { elementEvents: null },
	});
}
