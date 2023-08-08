import {
	DisplayThresholdContainer,
	TypographHeading,
	Typography,
} from './styles';
import { DisplayThresholdProps } from './types';

function DisplayThreshold({ threshold }: DisplayThresholdProps): JSX.Element {
	return (
		<DisplayThresholdContainer>
			<TypographHeading>Threshold </TypographHeading>
			<Typography>{threshold}</Typography>
		</DisplayThresholdContainer>
	);
}

export default DisplayThreshold;
