import { LoadingOutlined } from '@ant-design/icons';
import { Spin, SpinProps } from 'antd';
import React from 'react';

import { SpinerStyle } from './styles';

function Spinner({ size, tip, height }: SpinnerProps): JSX.Element {
	return (
		<SpinerStyle height={height}>
			<Spin spinning size={size} tip={tip} indicator={<LoadingOutlined spin />} />
		</SpinerStyle>
	);
}

interface SpinnerProps {
	size?: SpinProps['size'];
	tip?: SpinProps['tip'];
	height?: React.CSSProperties['height'];
}
Spinner.defaultProps = {
	size: undefined,
	tip: undefined,
	height: undefined,
};

export default Spinner;
