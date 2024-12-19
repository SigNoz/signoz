import { Color } from '@signozhq/design-tokens';
import { useIsDarkMode } from 'hooks/useDarkMode';

function GroupByIcon(): JSX.Element {
	const isDarkMode = useIsDarkMode();
	return (
		<svg width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
			<g
				clipPath="url(#prefix__clip0_4344_1236)"
				stroke={isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_500}
				strokeWidth="1.167"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M4.667 1.167H2.333c-.644 0-1.166.522-1.166 1.166v2.334c0 .644.522 1.166 1.166 1.166h2.334c.644 0 1.166-.522 1.166-1.166V2.333c0-.644-.522-1.166-1.166-1.166zM8.167 1.167a1.17 1.17 0 011.166 1.166v2.334a1.17 1.17 0 01-1.166 1.166M11.667 1.167a1.17 1.17 0 011.166 1.166v2.334a1.17 1.17 0 01-1.166 1.166M5.833 10.5H2.917c-.992 0-1.75-.758-1.75-1.75v-.583" />
				<path d="M4.083 12.25l1.75-1.75-1.75-1.75M11.667 8.167H9.333c-.644 0-1.166.522-1.166 1.166v2.334c0 .644.522 1.166 1.166 1.166h2.334c.644 0 1.166-.522 1.166-1.166V9.333c0-.644-.522-1.166-1.166-1.166z" />
			</g>
			<defs>
				<clipPath id="prefix__clip0_4344_1236">
					<path fill="#fff" d="M0 0h14v14H0z" />
				</clipPath>
			</defs>
		</svg>
	);
}

export default GroupByIcon;
