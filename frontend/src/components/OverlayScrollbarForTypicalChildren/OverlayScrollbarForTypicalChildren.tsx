import './overlayScrollbarsComponentProps.scss';

import { useIsDarkMode } from 'hooks/useDarkMode';
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
	const isDarkMode = useIsDarkMode();

	return (
		<OverlayScrollbarsComponent
			defer
			options={{
				scrollbars: {
					autoHide: 'scroll',
					theme: isDarkMode ? 'os-theme-light' : 'os-theme-dark',
				},
				...options,
			}}
			style={style}
			className="overlay-scrollbar"
		>
			{children}
		</OverlayScrollbarsComponent>
	);
}

OverlayScrollbarForTypicalChildren.defaultProps = { style: {}, options: {} };
