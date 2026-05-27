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

// Rapid theme switches cancel the in-flight transition and immediately start a
// new one; if we removed the class on the first transition's settled promise,
// we'd strip the CSS override mid-way through the next wipe and the user
// would briefly see the UA crossfade. Refcount so the class only comes off
// once every transition we started has settled.
let wipeActiveRefCount = 0;
const acquireWipeClass = (root: HTMLElement): void => {
	wipeActiveRefCount += 1;
	root.classList.add(THEME_WIPE_ACTIVE_CLASS);
};
const releaseWipeClass = (root: HTMLElement): void => {
	wipeActiveRefCount = Math.max(0, wipeActiveRefCount - 1);
	if (wipeActiveRefCount === 0) {
		root.classList.remove(THEME_WIPE_ACTIVE_CLASS);
	}
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
	acquireWipeClass(root);

	// Some Chromium versions throw if startViewTransition is called while
	// another transition is in setup. Track whether the callback ran so we
	// don't double-apply if the throw happens mid-callback.
	let applied = false;
	let transition: ViewTransition;
	try {
		transition = doc.startViewTransition(() => {
			applied = true;
			flushSync(applyChange);
		});
	} catch {
		releaseWipeClass(root);
		if (!applied) {
			applyChange();
		}
		return;
	}

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
		releaseWipeClass(root);
	};
	transition.finished.then(cleanup).catch(cleanup);
}
