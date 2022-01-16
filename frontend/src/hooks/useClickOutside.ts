import React, { useEffect } from 'react';

const useClickOutside = (
	ref: React.RefObject<HTMLElement>,
	callback: VoidFunction | null,
) => {
	const listener = (e: Event) => {
		if (ref.current && !ref.current.contains(e?.target as Node)) {
			if (callback) {
				callback();
			}
		}
	};

	useEffect(() => {
		document.addEventListener('mousedown', listener);
		document.addEventListener('touchstart', listener);

		return () => {
			document.removeEventListener('mousedown', listener);
			document.removeEventListener('touchstart', listener);
		};
	}, [ref, callback]);
};

export default useClickOutside;
