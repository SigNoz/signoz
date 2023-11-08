import './CustomColor.styles.scss';

import { Typography } from 'antd';

function CustomColor({ color }: CustomColorProps): JSX.Element {
	return (
		<div className="custom-color-container">
			<div className="custom-color-tag" style={{ background: color }} />
			<Typography.Text>{color}</Typography.Text>
		</div>
	);
}

type CustomColorProps = {
	color: string;
};

export default CustomColor;
