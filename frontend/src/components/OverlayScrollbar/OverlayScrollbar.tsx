import TypicalOverlayScrollbar from 'components/TypicalOverlayScrollbar/TypicalOverlayScrollbar';
import VirtuosoOverlayScrollbar from 'components/VirtuosoOverlayScrollbar/VirtuosoOverlayScrollbar';
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
			<VirtuosoOverlayScrollbar style={style} options={options}>
				{children}
			</VirtuosoOverlayScrollbar>
		);
	}

	return (
		<TypicalOverlayScrollbar style={style} options={options}>
			{children}
		</TypicalOverlayScrollbar>
	);
}

OverlayScrollbar.defaultProps = {
	isVirtuoso: false,
	style: {},
	options: {},
};

export default OverlayScrollbar;
