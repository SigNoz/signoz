import React, { useCallback, useEffect } from 'react';

const useClickOutside = (
	ref: React.RefObject<HTMLElement>,
	callback: (e: HTMLElement) => void | null,
): void => {
	const listener = useCallback(
		(e: Event) => {
			const node = e?.target as HTMLElement;

			if (ref.current && !ref.current.contains(node) && callback) {
				callback(node);
			}
		},
		[callback, ref],
	);

	useEffect(() => {
		document.addEventListener('click', listener);

		return (): void => {
			document.removeEventListener('click', listener);
		};
	}, [ref, callback, listener]);
};

export default useClickOutside;
