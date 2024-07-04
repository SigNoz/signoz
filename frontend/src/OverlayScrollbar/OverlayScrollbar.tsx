import { useIsDarkMode } from 'hooks/useDarkMode';
import { PartialOptions } from 'overlayscrollbars';
import {
	OverlayScrollbarsComponent,
	OverlayScrollbarsComponentProps,
} from 'overlayscrollbars-react';
import { CSSProperties, ReactElement } from 'react';

interface Props extends OverlayScrollbarsComponentProps {
	children: ReactElement;
	style?: CSSProperties;
	options?: PartialOptions;
}

export default function OverlayScrollbar({
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
			style={{ height: 'calc(100% - 70px)', ...style }}
		>
			{children}
		</OverlayScrollbarsComponent>
	);
}

OverlayScrollbar.defaultProps = { style: {}, options: {} };
