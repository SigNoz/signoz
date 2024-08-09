import './virtuosoOverlayScrollbar.scss';

import useInitializeOverlayScrollbar from 'hooks/useInitializeOverlayScrollbar/useInitializeOverlayScrollbar';
import { PartialOptions } from 'overlayscrollbars';
import React, { CSSProperties, ReactElement } from 'react';

interface VirtuosoOverlayScrollbarProps {
	children: ReactElement;
	style?: CSSProperties;
	options: PartialOptions;
}

export default function VirtuosoOverlayScrollbar({
	children,
	style,
	options,
}: VirtuosoOverlayScrollbarProps): JSX.Element {
	const { rootRef, setScroller } = useInitializeOverlayScrollbar(options);

	const enhancedChild = React.cloneElement(children, {
		scrollerRef: setScroller,
		'data-overlayscrollbars-initialize': true,
	});

	return (
		<div
			data-overlayscrollbars-initialize
			ref={rootRef}
			className="overlay-scroll-wrapper"
			style={style}
		>
			{enhancedChild}
		</div>
	);
}

VirtuosoOverlayScrollbar.defaultProps = { style: {} };
