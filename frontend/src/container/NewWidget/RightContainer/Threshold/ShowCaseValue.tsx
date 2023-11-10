import './ShowCaseValue.styles.scss';

import { useIsDarkMode } from 'hooks/useDarkMode';

import { ShowCaseValueProps } from './types';

function ShowCaseValue({ width, value }: ShowCaseValueProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	return (
		<div
			className={
				isDarkMode
					? `show-case-container show-case-dark`
					: `show-case-container show-case-light`
			}
			style={{ minWidth: width }}
		>
			{value}
		</div>
	);
}

export default ShowCaseValue;
