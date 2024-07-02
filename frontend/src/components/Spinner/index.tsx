import { Spin, SpinProps } from 'antd';
import SpinnerIcon from 'assets/CustomIcons/RotatingSpinner';
import { CSSProperties } from 'react';

import { DEFAULT_SPINNER_COLOR } from './constants';
import { SpinerStyle } from './styles';

const getStyleForSize = (
	size: 'small' | 'default' | 'large' | undefined,
): Record<string, string> => {
	const STYLES = {
		small: { height: '20px', width: '20px' },
		default: { height: '32px', width: '32px' },
		large: { height: '48px', width: '48px' },
	};

	if (!size) {
		return STYLES.small;
	}

	return STYLES[size];
};

function Spinner({
	size,
	tip,
	height,
	style,
	color,
}: SpinnerProps): JSX.Element {
	return (
		<SpinerStyle height={height} style={style}>
			<Spin
				spinning
				size={size}
				tip={tip}
				style={{ ...getStyleForSize(size) }}
				indicator={<SpinnerIcon color={color} />}
			/>
		</SpinerStyle>
	);
}

interface SpinnerProps {
	size?: SpinProps['size'];
	tip?: SpinProps['tip'];
	height?: CSSProperties['height'];
	style?: CSSProperties;
	color?: CSSProperties['stroke'];
}
Spinner.defaultProps = {
	size: 'small',
	tip: undefined,
	height: undefined,
	style: {},
	color: DEFAULT_SPINNER_COLOR,
};

export default Spinner;
