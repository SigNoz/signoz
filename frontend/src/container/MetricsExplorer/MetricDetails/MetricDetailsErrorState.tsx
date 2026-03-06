import { Color } from '@signozhq/design-tokens';
import { Button, Typography } from 'antd';
import { InfoIcon } from 'lucide-react';

import { MetricDetailsErrorStateProps } from './types';

function MetricDetailsErrorState({
	refetch,
	errorMessage,
}: MetricDetailsErrorStateProps): JSX.Element {
	return (
		<div className="metric-details-error-state">
			<InfoIcon size={20} color={Color.BG_CHERRY_500} />
			<Typography.Text>{errorMessage}</Typography.Text>
			{refetch && <Button onClick={refetch}>Retry</Button>}
		</div>
	);
}

export default MetricDetailsErrorState;
