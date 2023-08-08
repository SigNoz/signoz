import { DisplayThresholdContainer, Typography } from './styles';
import { DisplayThresholdProps } from './types';

function DisplayThreshold({ threshold }: DisplayThresholdProps): JSX.Element {
	return (
		<DisplayThresholdContainer>
			<div>Threshold </div>
			<Typography>{threshold}</Typography>
		</DisplayThresholdContainer>
	);
}

export default DisplayThreshold;
