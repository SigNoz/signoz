import { Color } from '@signozhq/design-tokens';
import { useIsDarkMode } from 'hooks/useDarkMode';

function FlamegraphImg(): JSX.Element {
	const isDarkMode = useIsDarkMode();
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M8 3c1 3 2.5 3.5 3.5 4.5A5 5 0 0113 11a5 5 0 11-10 0c0-.3 0-.6.1-.9a2 2 0 103.3-2C4 5.5 7 3 8 3zM21 4h-8M20 14.5h-3M20 9.5h-3M21 20H4"
				stroke={isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_500}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export default FlamegraphImg;
