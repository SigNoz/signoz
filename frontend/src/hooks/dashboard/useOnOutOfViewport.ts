import { useEffect, useRef } from 'react';

interface UseOnOutOfViewportOptions {
	onOutOfViewport: () => void;
	enabled?: boolean;
}

export function useOnOutOfViewport({
	onOutOfViewport,
	enabled = true,
}: UseOnOutOfViewportOptions): React.RefObject<HTMLDivElement> {
	const ref = useRef<HTMLDivElement>(null);
	const wasVisibleRef = useRef(false);

	useEffect(() => {
		if (!enabled || !ref.current) return;

		const element = ref.current;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						wasVisibleRef.current = true;
					} else if (wasVisibleRef.current) {
						// Only trigger if it was visible before (prevents triggering on mount)
						onOutOfViewport();
						wasVisibleRef.current = false;
					}
				});
			},
			{ threshold: 0 },
		);

		observer.observe(element);

		return (): void => {
			observer.disconnect();
		};
	}, [onOutOfViewport, enabled]);

	return ref;
}
