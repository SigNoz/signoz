import { Color } from '@signozhq/design-tokens';
import { Button } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { Info } from '@signozhq/icons';

import { MetricDetailsErrorStateProps } from './types';

function MetricDetailsErrorState({
	refetch,
	errorMessage,
}: MetricDetailsErrorStateProps): JSX.Element {
	return (
		<div className="metric-details-error-state">
			<Info size={20} color={Color.BG_CHERRY_500} />
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="inherit"
				as="span"
				textOverflow="wrap"
			>
				{errorMessage}
			</Typography>
			{refetch && <Button onClick={refetch}>Retry</Button>}
		</div>
	);
}

export default MetricDetailsErrorState;
