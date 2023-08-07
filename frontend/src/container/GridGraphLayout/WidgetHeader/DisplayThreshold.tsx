import { Typography } from 'antd';
import { themeColors } from 'constants/theme';
import { ReactNode } from 'react';

import { DisplayThresholdContainer } from './styles';

function DisplayThreshold({ threshold }: DisplayThresholdProps): JSX.Element {
	return (
		<DisplayThresholdContainer>
			<div>Threshold</div>
			<Typography.Text style={{ color: themeColors.white }}>
				{threshold}
			</Typography.Text>
		</DisplayThresholdContainer>
	);
}

interface DisplayThresholdProps {
	threshold: ReactNode;
}

export default DisplayThreshold;
