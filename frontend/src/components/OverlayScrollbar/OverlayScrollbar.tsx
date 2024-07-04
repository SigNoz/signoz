import OverlayScrollbarForTypicalChildren from 'components/OverlayScrollbarForTypicalChildren/OverlayScrollbarForTypicalChildren';
import OverlayScrollbarForVirtuosoChildren from 'components/OverlayScrollbarForVirtuosoChildren/OverlayScrollbarForVirtuosoChildren';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { PartialOptions } from 'overlayscrollbars';
import { CSSProperties, ReactElement, useMemo } from 'react';

type Props = {
	children: ReactElement;
	isVirtuoso?: boolean;
	style?: CSSProperties;
	options?: PartialOptions;
};

function OverlayScrollbar({
	children,
	isVirtuoso,
	style,
	options: customOptions,
}: Props): any {
	const isDarkMode = useIsDarkMode();
	const options = useMemo(
		() =>
			({
				scrollbars: {
					autoHide: 'scroll',
					theme: isDarkMode ? 'os-theme-light' : 'os-theme-dark',
				},
				...(customOptions || {}),
			} as PartialOptions),
		[customOptions, isDarkMode],
	);

	if (isVirtuoso) {
		return (
			<OverlayScrollbarForVirtuosoChildren style={style} options={options}>
				{children}
			</OverlayScrollbarForVirtuosoChildren>
		);
	}

	return (
		<OverlayScrollbarForTypicalChildren style={style} options={options}>
			{children}
		</OverlayScrollbarForTypicalChildren>
	);
}

OverlayScrollbar.defaultProps = {
	isVirtuoso: false,
	style: {},
	options: {},
};

export default OverlayScrollbar;
