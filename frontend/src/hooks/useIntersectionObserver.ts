import { RefObject, useEffect, useState } from 'react';

export function useIntersectionObserver<T extends HTMLElement>(
	ref: RefObject<T>,
	options?: IntersectionObserverInit,
	isObserverOnce?: boolean,
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

		if (currentReference) {
			observer.observe(currentReference);
		}

		return (): void => {
			if (currentReference) {
				observer.unobserve(currentReference);
			}
		};
	}, [ref, options, isObserverOnce]);

	return isIntersecting;
}
