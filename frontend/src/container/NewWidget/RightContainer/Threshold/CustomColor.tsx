import { Typography } from 'antd';

import { CustomColorProps } from './types';

import './CustomColor.styles.scss';

function CustomColor({ color }: CustomColorProps): JSX.Element {
	return (
		<div className="custom-color-container">
			<div className="custom-color-tag" style={{ background: color }} />
			<Typography.Text className={`custom-color-text`}>{color}</Typography.Text>
		</div>
	);
}

export default CustomColor;
