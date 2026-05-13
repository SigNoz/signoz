import { Badge } from '@signozhq/ui/badge';
import { TooltipSimple } from '@signozhq/ui/tooltip';

import styles from './LabelTag.module.scss';

export interface LabelTagProps {
	label: string;
	color?:
		| 'primary'
		| 'secondary'
		| 'success'
		| 'error'
		| 'warning'
		| 'robin'
		| 'forest'
		| 'amber'
		| 'sienna'
		| 'cherry'
		| 'sakura'
		| 'aqua'
		| 'vanilla';
	value?: string;
}

function LabelTag({ label, value, color }: LabelTagProps): JSX.Element {
	const tooltipTitle = value ? `${label}: ${value}` : label;

	return (
		<TooltipSimple title={tooltipTitle}>
			<Badge
				color={color}
				className={styles.labelBadge}
				variant="outline"
				data-testid={`label-tag-${label}`}
			>
				<span className={styles.labelValue}>{tooltipTitle}</span>
			</Badge>
		</TooltipSimple>
	);
}

export default LabelTag;
