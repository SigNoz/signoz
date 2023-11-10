import './CustomColor.styles.scss';

import { Typography } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { CustomColorProps } from './types';

function CustomColor({ color }: CustomColorProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	return (
		<div className="custom-color-container">
			<div className="custom-color-tag" style={{ background: color }} />
			<Typography.Text
				className={
					isDarkMode
						? `custom-color-typography-dark`
						: `custom-color-typograph-light`
				}
			>
				{color}
			</Typography.Text>
		</div>
	);
}

export default CustomColor;
