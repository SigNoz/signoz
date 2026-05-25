import { flushSync } from 'react-dom';

const WIPE_DURATION_MS = 400;
const WIPE_EASING = 'ease-out';

type ViewTransition = { ready: Promise<void> };
type DocumentWithVT = Document & {
	startViewTransition?: (callback: () => void) => ViewTransition;
};

export function canAnimateThemeTransition(): boolean {
	const doc = document as DocumentWithVT;
	if (typeof doc.startViewTransition !== 'function') {
		return false;
	}
	return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Runs `applyChange` inside a View Transition and wipes the new theme in from
// left to right via a polygon clip-path on ::view-transition-new(root).
// Callers should gate on canAnimateThemeTransition() first; this is a safe
// no-animation fallback otherwise.
export function runThemeTransition(applyChange: () => void): void {
	const doc = document as DocumentWithVT;
	if (!doc.startViewTransition) {
		applyChange();
		return;
	}

	const transition = doc.startViewTransition(() => {
		flushSync(applyChange);
	});

	const from = 'polygon(0 0, 0 0, 0 100%, 0 100%)';
	const to = 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';

	transition.ready
		.then(() =>
			document.documentElement.animate(
				{ clipPath: [from, to] },
				{
					duration: WIPE_DURATION_MS,
					easing: WIPE_EASING,
					pseudoElement: '::view-transition-new(root)',
				},
			),
		)
		.catch(() => {
			// Transition cancelled — applyChange has already run, so nothing to do.
		});
}
