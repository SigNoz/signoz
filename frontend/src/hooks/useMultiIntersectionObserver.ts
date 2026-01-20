import { useCallback, useEffect, useRef, useState } from 'react';

type SetElement = (el: Element | null) => void;

// To manage intersection observers for multiple items
export function useMultiIntersectionObserver(
	itemCount: number,
	options: IntersectionObserverInit = { threshold: 0.1 },
): {
	visibilities: boolean[];
	setElement: (index: number) => SetElement;
} {
	const elementsRef = useRef<(Element | null)[]>([]);

	const [everVisibles, setEverVisibles] = useState<boolean[]>(
		new Array(itemCount).fill(false),
	);

	const setElement = useCallback<(index: number) => SetElement>(
		(index) => (el): void => {
			elementsRef.current[index] = el;
		},
		[],
	);

	useEffect(() => {
		if (!elementsRef.current.length) return;

		const observer = new IntersectionObserver((entries) => {
			setEverVisibles((prev) => {
				const newVis = [...prev];
				let changed = false;
				entries.forEach((entry) => {
					const idx = elementsRef.current.indexOf(entry.target);
					if (idx !== -1 && entry.isIntersecting && !newVis[idx]) {
						newVis[idx] = true;
						changed = true;
					}
				});
				return changed ? newVis : prev;
			});
		}, options);

		elementsRef.current.forEach((el) => {
			if (el) observer.observe(el);
		});

		return (): void => {
			observer.disconnect();
		};
	}, [itemCount, options]);

	return { visibilities: everVisibles, setElement };
}
