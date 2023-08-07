import { ReactNode } from 'react';

import { DisplayThresholdContainer, Typography } from './styles';

function DisplayThreshold({ threshold }: DisplayThresholdProps): JSX.Element {
	return (
		<DisplayThresholdContainer>
			<div>Threshold </div>
			<Typography>{threshold}</Typography>
		</DisplayThresholdContainer>
	);
}

interface DisplayThresholdProps {
	threshold: ReactNode;
}

export default DisplayThreshold;
