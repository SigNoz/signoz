import { SolidInfoCircle } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';

import { DisplayThresholdContainer } from 'container/WidgetCard/Header/styles';
import { DisplayThresholdProps } from 'container/WidgetCard/Header/types';

function DisplayThreshold({ threshold }: DisplayThresholdProps): JSX.Element {
	return (
		<DisplayThresholdContainer>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="tertiary"
				as="span"
				textOverflow="wrap"
			>
				Threshold{' '}
			</Typography>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="tertiary"
				as="span"
				display="inline-flex"
				marginLeft={2}
				textOverflow="wrap"
			>
				{threshold || <SolidInfoCircle size="md" />}
			</Typography>
		</DisplayThresholdContainer>
	);
}

export default DisplayThreshold;
