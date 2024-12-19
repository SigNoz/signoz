import { Color } from '@signozhq/design-tokens';
import { useIsDarkMode } from 'hooks/useDarkMode';

function ConfigureIcon(): JSX.Element {
	const isDarkMode = useIsDarkMode();
	return (
		<svg width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
			<g
				stroke={isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_500}
				strokeWidth="1.333"
				strokeLinecap="round"
			>
				<path
					d="M9.71 4.745a.576.576 0 000 .806l.922.922a.576.576 0 00.806 0l2.171-2.171a3.455 3.455 0 01-4.572 4.572l-3.98 3.98a1.222 1.222 0 11-1.727-1.728l3.98-3.98a3.455 3.455 0 014.572-4.572L9.717 4.739l-.006.006z"
					strokeLinejoin="round"
				/>
				<path d="M4 7L2.527 5.566a1.333 1.333 0 01-.013-1.898l.81-.81a1.333 1.333 0 011.991.119L5.333 3M10.75 10.988l1.179 1.178m0 0l-.138.138a.833.833 0 00.387 1.397v0a.833.833 0 00.792-.219l.446-.446a.833.833 0 00.176-.917v0a.833.833 0 00-1.355-.261l-.308.308z" />
			</g>
		</svg>
	);
}

export default ConfigureIcon;
