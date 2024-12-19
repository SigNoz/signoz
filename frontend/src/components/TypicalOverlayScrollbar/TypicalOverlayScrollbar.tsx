import './typicalOverlayScrollbar.scss';

import { PartialOptions } from 'overlayscrollbars';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { CSSProperties, ReactElement } from 'react';

interface Props {
	children: ReactElement;
	style?: CSSProperties;
	options?: PartialOptions;
}

export default function TypicalOverlayScrollbar({
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
			data-overlayscrollbars-initialize
		>
			{children}
		</OverlayScrollbarsComponent>
	);
}

TypicalOverlayScrollbar.defaultProps = { style: {}, options: {} };
