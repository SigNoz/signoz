import { CSSProperties } from 'react';
import { Loader } from '@signozhq/icons';
import { Spin, SpinProps } from 'antd';

import { SpinerStyle } from './styles';

function Spinner({
	size,
	tip,
	height,
	style,
	testId,
}: SpinnerProps): JSX.Element {
	return (
		<SpinerStyle height={height} style={style} data-testid={testId}>
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
	testId?: string;
}
Spinner.defaultProps = {
	size: undefined,
	tip: undefined,
	height: undefined,
	style: {},
	testId: undefined,
};

export default Spinner;
