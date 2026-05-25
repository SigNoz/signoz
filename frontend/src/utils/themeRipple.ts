import { flushSync } from 'react-dom';

const RIPPLE_DURATION_MS = 500;
const RIPPLE_EASING = 'ease-in-out';

type ViewTransition = { ready: Promise<void> };
type DocumentWithVT = Document & {
	startViewTransition?: (callback: () => void) => ViewTransition;
};

export type RippleOrigin = { x: number; y: number };

export function getRippleOrigin(
	element: Element | null | undefined,
): RippleOrigin {
	const rect = element?.getBoundingClientRect();
	if (!rect) {
		return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
	}
	return {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height / 2,
	};
}

export function canAnimateThemeRipple(): boolean {
	const doc = document as DocumentWithVT;
	if (typeof doc.startViewTransition !== 'function') {
		return false;
	}
	return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Runs `applyChange` inside a View Transition and grows a circular clip-path
// from `origin` until it covers the viewport. Callers should gate on
// canAnimateThemeRipple() first; this is a safe no-animation fallback otherwise.
export function runThemeRipple(
	origin: RippleOrigin,
	applyChange: () => void,
): void {
	const doc = document as DocumentWithVT;
	if (!doc.startViewTransition) {
		applyChange();
		return;
	}

	const transition = doc.startViewTransition(() => {
		flushSync(applyChange);
	});

	const endRadius = distanceToFurthestCorner(origin);
	const fromCircle = `circle(0px at ${origin.x}px ${origin.y}px)`;
	const toCircle = `circle(${endRadius}px at ${origin.x}px ${origin.y}px)`;

	transition.ready
		.then(() => {
			document.documentElement.animate(
				{ clipPath: [fromCircle, toCircle] },
				{
					duration: RIPPLE_DURATION_MS,
					easing: RIPPLE_EASING,
					pseudoElement: '::view-transition-new(root)',
				},
			);
		})
		.catch(() => {
			// Transition cancelled — applyChange has already run, so nothing to do.
		});
}

function distanceToFurthestCorner({ x, y }: RippleOrigin): number {
	return Math.hypot(
		Math.max(x, window.innerWidth - x),
		Math.max(y, window.innerHeight - y),
	);
}
