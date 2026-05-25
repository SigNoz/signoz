import { flushSync } from 'react-dom';

const WIPE_DURATION_MS = 400;
const WIPE_EASING = 'ease-out';

// Toggled on <html> for the duration of the wipe so the CSS overrides
// (animation: none on ::view-transition-{old,new}(root)) don't leak into
// any future, unrelated view transitions in the app.
export const THEME_WIPE_ACTIVE_CLASS = 'theme-wipe-active';

type ViewTransition = {
	ready: Promise<void>;
	finished: Promise<void>;
};
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

	const root = document.documentElement;
	root.classList.add(THEME_WIPE_ACTIVE_CLASS);

	const transition = doc.startViewTransition(() => {
		flushSync(applyChange);
	});

	const from = 'polygon(0 0, 0 0, 0 100%, 0 100%)';
	const to = 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';

	transition.ready
		.then(() =>
			root.animate(
				{ clipPath: [from, to] },
				{
					duration: WIPE_DURATION_MS,
					easing: WIPE_EASING,
					pseudoElement: '::view-transition-new(root)',
				},
			),
		)
		.catch(() => {
			// Transition cancelled — applyChange has already run.
		});

	const cleanup = (): void => {
		root.classList.remove(THEME_WIPE_ACTIVE_CLASS);
	};
	transition.finished.then(cleanup).catch(cleanup);
}
