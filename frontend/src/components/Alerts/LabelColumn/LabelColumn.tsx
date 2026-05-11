import {
	Badge,
	Popover,
	PopoverContent,
	PopoverTrigger,
	TooltipSimple,
} from '@signozhq/ui';

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

function getLabelRenderingValue(label: string, value?: string): JSX.Element {
	const title = value ? `${label}: ${value}` : label;
	const content = value ? `${label}: ${value}` : label;

	return (
		<span title={title} className={styles.labelValue}>
			{content}
		</span>
	);
}

function getLabelAndValueContent(label: string, value?: string): string {
	return value ? `${label}: ${value}` : label;
}

function LabelTag({
	label,
	value,
	color,
}: {
	label: string;
	color?: LabelColumnProps['color'];
	value?: LabelColumnProps['value'];
}): JSX.Element {
	const tooltipTitle = value?.[label] ? `${label}: ${value[label]}` : label;

	return (
		<TooltipSimple title={tooltipTitle}>
			<Badge
				color={color}
				className={styles.labelBadge}
				variant="outline"
				data-testid={`label-tag-${label}`}
			>
				{getLabelRenderingValue(label, value?.[label])}
			</Badge>
		</TooltipSimple>
	);
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
				<LabelTag key={label} label={label} color={color} value={value} />
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
								{getLabelAndValueContent(label, value?.[label])}
							</Badge>
						))}
					</PopoverContent>
				</Popover>
			)}
		</div>
	);
}

export default LabelColumn;
