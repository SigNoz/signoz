import { RefObject, useEffect, useState } from 'react';

export function useIntersectionObserver<T extends HTMLElement>(
	ref: RefObject<T>,
	options?: IntersectionObserverInit,
	isObserverOnce?: boolean,
	/** Defer observation by this many ms to let a transient mount layout settle. */
	startDelayMs = 0,
): boolean {
	const [isIntersecting, setIntersecting] = useState(false);

	useEffect(() => {
		const currentReference = ref?.current;

		const observer = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting) {
				setIntersecting(true);

				if (isObserverOnce) {
					// Optionally: Once it becomes visible, we don't need to observe it anymore
					observer.unobserve(entry.target);
				}
			} else {
				setIntersecting(false);
			}
		}, options);

		const startObserving = (): void => {
			if (currentReference) {
				observer.observe(currentReference);
			}
		};

		let timer: ReturnType<typeof setTimeout> | undefined;
		if (startDelayMs > 0) {
			timer = setTimeout(startObserving, startDelayMs);
		} else {
			startObserving();
		}

		return (): void => {
			if (timer) {
				clearTimeout(timer);
			}
			if (currentReference) {
				observer.unobserve(currentReference);
			}
		};
	}, [ref, options, isObserverOnce, startDelayMs]);

	return isIntersecting;
}
