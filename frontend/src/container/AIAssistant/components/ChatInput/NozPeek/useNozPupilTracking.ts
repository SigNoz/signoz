import { RefObject, useEffect } from 'react';

// Noz has settled on the edge by now.
const SETTLE_MS = 1900;
// Furthest the pupil moves, in SVG units.
const MAX_OFFSET = 1.25;
// Cursor distance, in px, at which the pupil reaches MAX_OFFSET.
const FULL_REACH_PX = 160;

export function useNozPupilTracking(
	eyeRef: RefObject<SVGCircleElement>,
	pupilRef: RefObject<SVGGElement>,
): void {
	useEffect(() => {
		const prefersReducedMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)',
		).matches;
		let isSettled = false;
		const timer = window.setTimeout(
			() => {
				isSettled = true;
			},
			prefersReducedMotion ? 0 : SETTLE_MS,
		);

		const onMouseMove = (event: MouseEvent): void => {
			const eye = eyeRef.current;
			const pupil = pupilRef.current;
			if (!isSettled || !eye || !pupil) {
				return;
			}
			const rect = eye.getBoundingClientRect();
			const dx = event.clientX - (rect.left + rect.width / 2);
			const dy = event.clientY - (rect.top + rect.height / 2);
			const distance = Math.hypot(dx, dy) || 1;
			const reach = Math.min(1, distance / FULL_REACH_PX) * MAX_OFFSET;
			pupil.style.transform = `translate(${((dx / distance) * reach).toFixed(3)}px, ${((dy / distance) * reach).toFixed(3)}px)`;
		};

		window.addEventListener('mousemove', onMouseMove);
		return (): void => {
			window.clearTimeout(timer);
			window.removeEventListener('mousemove', onMouseMove);
		};
	}, [eyeRef, pupilRef]);
}
