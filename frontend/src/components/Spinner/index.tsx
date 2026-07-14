import { CSSProperties } from 'react';
import { Loader } from '@signozhq/icons';
import { Spin, SpinProps } from 'antd';

import { SpinerStyle } from './styles';

function Spinner({ size, tip, height, style }: SpinnerProps): JSX.Element {
	return (
		<SpinerStyle height={height} style={style}>
			<Spin
				spinning
				size={size}
				tip={tip}
				indicator={
					<Loader
						className="animate-spin"
						role="img"
						aria-label="loading"
						size="md"
					/>
				}
			/>
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
