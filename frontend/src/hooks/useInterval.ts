import { useEffect, useRef } from 'react';

function useInterval(callback: () => void, delay: number): void {
	const savedCallback = useRef<() => void>();

	useEffect(() => {
		savedCallback.current = callback;
	});

	useEffect(() => {
		function tick(): void {
			if (savedCallback.current) {
				savedCallback.current();
			}
		}

		const id = setInterval(tick, delay);
		return (): void => clearInterval(id);
	}, [delay]);
}

export default useInterval;
