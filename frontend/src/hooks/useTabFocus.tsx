import { useEffect, useRef, useState } from 'react';

const useTabVisibility = (): boolean => {
	const [isVisible, setIsVisible] = useState(false);
	const prevVisibilityRef = useRef<boolean>(isVisible);

	useEffect(() => {
		const handleVisibilityChange = (): void => {
			const isTabVisible = document.visibilityState === 'visible';
			if (isTabVisible && !prevVisibilityRef.current) {
				setIsVisible(true);
			} else if (!isTabVisible && prevVisibilityRef.current) {
				setIsVisible(false);
			}
			prevVisibilityRef.current = isTabVisible;
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);

		return (): void => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, []);

	return isVisible;
};

export default useTabVisibility;
