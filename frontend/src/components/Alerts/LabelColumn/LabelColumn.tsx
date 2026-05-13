import { Badge } from '@signozhq/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@signozhq/ui/popover';

import LabelTag from './LabelTag';

import styles from './LabelColumn.module.scss';

export interface LabelColumnProps {
	labels: string[];
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
	value?: { [key: string]: string };
}

const MAX_LABELS_TO_DISPLAY = 5;

function LabelColumn({
	labels,
	value,
	color = 'primary',
}: LabelColumnProps): JSX.Element {
	const visibleLabels =
		labels.length > MAX_LABELS_TO_DISPLAY ? labels.slice(0, 3) : labels;
	const remainingLabels =
		labels.length > MAX_LABELS_TO_DISPLAY ? labels.slice(3) : [];

	return (
		<div className={styles.labelColumn} data-testid="label-column">
			{visibleLabels.map((label) => (
				<LabelTag key={label} label={label} color={color} value={value?.[label]} />
			))}
			{remainingLabels.length > 0 && (
				<Popover>
					<PopoverTrigger asChild>
						<Badge
							color={color}
							className={styles.labelBadge}
							variant="outline"
							data-testid="label-overflow-badge"
						>
							+{remainingLabels.length}
						</Badge>
					</PopoverTrigger>
					<PopoverContent
						side="bottom"
						align="end"
						className={styles.labelPopover}
						data-testid="label-popover"
					>
						{labels.map((label) => (
							<Badge
								key={label}
								color={color}
								className={styles.labelBadgePopover}
								variant="outline"
								data-testid={`label-popover-item-${label}`}
							>
								{value?.[label] ? `${label}: ${value?.[label]}` : label}
							</Badge>
						))}
					</PopoverContent>
				</Popover>
			)}
		</div>
	);
}

export default LabelColumn;
