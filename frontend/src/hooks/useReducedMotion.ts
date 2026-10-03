import { useEffect, useState } from 'react';

function useReducedMotion(): boolean {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(
		() => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
	);

	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		const onChange = (e: MediaQueryListEvent): void => {
			setPrefersReducedMotion(e.matches);
		};
		mediaQuery.addEventListener('change', onChange);
		return (): void => mediaQuery.removeEventListener('change', onChange);
	}, []);

	return prefersReducedMotion;
}

export default useReducedMotion;
