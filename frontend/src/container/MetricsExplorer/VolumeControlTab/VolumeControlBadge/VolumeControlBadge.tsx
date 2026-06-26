import { Gauge } from '@signozhq/icons';
import { MetricreductionruletypesGettableReductionRuleDTO } from 'api/generated/services/sigNoz.schemas';

import { Badge } from '@signozhq/ui/badge';

interface VolumeControlBadgeProps {
	rule: MetricreductionruletypesGettableReductionRuleDTO;
}

function VolumeControlBadge({ rule }: VolumeControlBadgeProps): JSX.Element {
	// ? @srikanth: will this every be undefined? type of the render in parent does not have undefined
	if (!rule) {
		return <span data-testid="vc-badge-none">—</span>;
	}
	return (
		<Badge
			data-testid="vc-badge-active"
			variant="outline"
			color={!rule.active ? 'success' : 'warning'}
		>
			<Gauge size={12} />
			{!rule.active ? 'Active' : 'Pending'}
		</Badge>
	);
}

export default VolumeControlBadge;
