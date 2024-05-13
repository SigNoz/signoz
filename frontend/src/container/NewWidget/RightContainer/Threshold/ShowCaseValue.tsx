import './ShowCaseValue.styles.scss';

import cx from 'classnames';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { ShowCaseValueProps } from './types';

function ShowCaseValue({
	width,
	value,
	className = '',
}: ShowCaseValueProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	return (
		<div
			className={cx(
				isDarkMode
					? `show-case-container show-case-dark`
					: `show-case-container show-case-light`,
				className,
			)}
			style={{ minWidth: width }}
		>
			{value}
		</div>
	);
}

export default ShowCaseValue;
