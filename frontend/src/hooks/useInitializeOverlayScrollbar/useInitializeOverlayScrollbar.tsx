import { PartialOptions } from 'overlayscrollbars';
import { useOverlayScrollbars } from 'overlayscrollbars-react';
import {
	Dispatch,
	RefObject,
	SetStateAction,
	useEffect,
	useRef,
	useState,
} from 'react';

const useInitializeOverlayScrollbar = (
	options: PartialOptions,
): {
	setScroller: Dispatch<SetStateAction<null>>;
	rootRef: RefObject<HTMLDivElement>;
} => {
	const rootRef = useRef(null);
	const [scroller, setScroller] = useState(null);
	const [initialize, osInstance] = useOverlayScrollbars({
		defer: true,
		options,
	});

	useEffect(() => {
		const { current: root } = rootRef;

		if (scroller && root) {
			initialize({
				target: root,
				elements: {
					viewport: scroller,
				},
			});
		}

		return (): void => osInstance()?.destroy();
	}, [scroller, initialize, osInstance]);

	return { setScroller, rootRef };
};

export default useInitializeOverlayScrollbar;
