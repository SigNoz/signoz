import './CustomColor.styles.scss';

import { Typography } from 'antd';

import { CustomColorProps } from './types';

function CustomColor({ color }: CustomColorProps): JSX.Element {
	return (
		<div className="custom-color-container">
			<div className="custom-color-tag" style={{ background: color }} />
			<Typography.Text>{color}</Typography.Text>
		</div>
	);
}

export default CustomColor;
