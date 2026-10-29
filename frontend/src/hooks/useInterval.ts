import { useEffect, useRef } from 'react';

function useInterval(
	callback: () => void,
	delay: number,
	enabled = true,
): void {
	const savedCallback = useRef<() => void>();

	useEffect(() => {
		savedCallback.current = callback;
	}, [callback]);

	useEffect(() => {
		function tick(): void {
			if (savedCallback.current) {
				savedCallback.current();
			}
		}

		let id: ReturnType<typeof setInterval> | undefined;

		if (enabled) {
			id = setInterval(tick, delay);
		}

		return (): void => {
			if (id) {
				clearInterval(id);
			}
		};
	}, [delay, enabled]);
}

export default useInterval;
