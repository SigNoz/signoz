import './virtuosoOverlayScrollbar.scss';

import useInitializeOverlayScrollbar from 'hooks/useInitializeOverlayScrollbar/useInitializeOverlayScrollbar';
import React, { ReactElement } from 'react';

interface VirtuosoOverlayScrollbarProps {
	children: ReactElement;
}

export default function VirtuosoOverlayScrollbar({
	children,
}: VirtuosoOverlayScrollbarProps): JSX.Element {
	const { rootRef, setScroller } = useInitializeOverlayScrollbar();

	const enhancedChild = React.cloneElement(children, {
		scrollerRef: setScroller,
	});

	return (
		<div
			data-overlayscrollbars-initialize=""
			ref={rootRef}
			className="overlay-scroll-wrapper"
		>
			{enhancedChild}
		</div>
	);
}
