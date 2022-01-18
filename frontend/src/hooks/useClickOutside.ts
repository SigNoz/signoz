import React, { useEffect } from 'react';

const useClickOutside = (
	ref: React.RefObject<HTMLElement>,
	callback: (e: HTMLElement) => void | null,
) => {
	const listener = (e: Event) => {
		const node = e?.target as HTMLElement;

		if (ref.current && !ref.current.contains(node)) {
			if (callback) {
				callback(node);
			}
		}
	};

	useEffect(() => {
		document.addEventListener('click', listener);

		return () => {
			document.removeEventListener('click', listener);
		};
	}, [ref, callback]);
};

export default useClickOutside;
