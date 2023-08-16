import { useEffect, useRef } from 'react';

function useInterval(
	callback: () => void,
	delay: number,
	enabled = true,
): void {
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

		let id: NodeJS.Timer;

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
