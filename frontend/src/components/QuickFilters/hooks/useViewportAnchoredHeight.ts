import { RefObject, useLayoutEffect, useState } from 'react';

/**
 * Height from the element's rendered top edge down to the viewport bottom.
 * The settings drawer is absolutely positioned inside a section that can
 * extend below the fold, and its top offset moves with whatever is rendered
 * above (top nav, trial/payment banners), so a static css height cannot know
 * where the viewport ends.
 */
export function useViewportAnchoredHeight(
	ref: RefObject<HTMLElement>,
	enabled: boolean,
): number | undefined {
	const [height, setHeight] = useState<number>();

	useLayoutEffect((): (() => void) | undefined => {
		if (!enabled || !ref.current) {
			return undefined;
		}
		const el = ref.current;

		const update = (): void => {
			const { top } = el.getBoundingClientRect();
			setHeight(Math.max(0, window.innerHeight - top));
		};
		update();

		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return (): void => {
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [ref, enabled]);

	return enabled ? height : undefined;
}
