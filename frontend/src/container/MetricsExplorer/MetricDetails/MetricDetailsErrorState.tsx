import { Color } from '@signozhq/design-tokens';
import { Info } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import { MetricDetailsErrorStateProps } from './types';

function MetricDetailsErrorState({
	refetch,
	errorMessage,
}: MetricDetailsErrorStateProps): JSX.Element {
	return (
		<div className="metric-details-error-state">
			<Info size={20} color={Color.BG_CHERRY_500} />
			<Typography.Text>{errorMessage}</Typography.Text>
			{refetch && (
				<Button onClick={refetch} variant="outlined" color="secondary">
					Retry
				</Button>
			)}
		</div>
	);
}

export default MetricDetailsErrorState;
