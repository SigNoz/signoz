import { LoadingOutlined } from '@ant-design/icons';
import { Spin, SpinProps } from 'antd';
import { CSSProperties } from 'react';

import { SpinerStyle } from './styles';

function Spinner({ size, tip, height, style }: SpinnerProps): JSX.Element {
	return (
		<SpinerStyle height={height} style={style}>
			<Spin spinning size={size} tip={tip} indicator={<LoadingOutlined spin />} />
		</SpinerStyle>
	);
}

interface SpinnerProps {
	/**
	 * Size of the spinner
	 */
	size?: SpinProps['size'];

	/**
	 * Text to show when the spinner is spinning
	 */
	tip?: SpinProps['tip'];

	/**
	 * Height of the spinner
	 */
	height?: CSSProperties['height'];

	/**
	 * Style of the spinner
	 */
	style?: CSSProperties;
}
Spinner.defaultProps = {
	size: undefined,
	tip: undefined,
	height: undefined,
	style: {},
};

export default Spinner;
