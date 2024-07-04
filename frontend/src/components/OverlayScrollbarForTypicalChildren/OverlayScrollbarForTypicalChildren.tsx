import './overlayScrollbarsComponentProps.scss';

import { PartialOptions } from 'overlayscrollbars';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { CSSProperties, ReactElement } from 'react';

interface Props {
	children: ReactElement;
	style?: CSSProperties;
	options?: PartialOptions;
}

export default function OverlayScrollbarForTypicalChildren({
	children,
	style,
	options,
}: Props): ReturnType<typeof OverlayScrollbarsComponent> {
	return (
		<OverlayScrollbarsComponent
			defer
			options={options}
			style={style}
			className="overlay-scrollbar"
		>
			{children}
		</OverlayScrollbarsComponent>
	);
}

OverlayScrollbarForTypicalChildren.defaultProps = { style: {}, options: {} };
