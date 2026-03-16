import { CSSProperties } from 'react';
import { Spin, SpinProps } from 'antd';

import { SpinerStyle } from './styles';
import { LoaderCircle } from '@signozhq/icons';

function Spinner({ size, tip, height, style }: SpinnerProps): JSX.Element {
	return (
		<SpinerStyle height={height} style={style}>
			<Spin spinning size={size} tip={tip} indicator={<LoaderCircle className='animate-spin' />} />
		</SpinerStyle>
	);
}

interface SpinnerProps {
	size?: SpinProps['size'];
	tip?: SpinProps['tip'];
	height?: CSSProperties['height'];
	style?: CSSProperties;
}
Spinner.defaultProps = {
	size: undefined,
	tip: undefined,
	height: undefined,
	style: {},
};

export default Spinner;
