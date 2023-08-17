import throttle from 'lodash-es/throttle';
import { useEffect, useState } from 'react';

import { UseScrollToTop } from './types';

function useScrollToTop(visibleOffset = 200): UseScrollToTop {
	const [isVisible, setIsVisible] = useState<boolean>(false);

	const scrollToTop = (): void => {
		window.scrollTo({
			top: 0,
			behavior: 'smooth',
		});
	};

	useEffect(() => {
		const toggleVisibility = throttle(() => {
			setIsVisible(window.pageYOffset > visibleOffset);
		}, 300);

		window.addEventListener('scroll', toggleVisibility);

		return (): void => window.removeEventListener('scroll', toggleVisibility);
	}, [visibleOffset]);

	return { isVisible, scrollToTop };
}

export default useScrollToTop;
