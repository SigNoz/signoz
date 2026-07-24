import styles from './GroupedStatusCounts.module.scss';
import TanStackTable from 'components/TanStackTableView';
import { Typography } from '@signozhq/ui/typography';

export interface StatusBreakdownItem {
	label: string;
	value: number;
}

export interface StatusCountItem {
	value: number;
	label: string;
	color: string;
	breakdown?: StatusBreakdownItem[];
}

interface GroupedStatusCountsProps {
	items: StatusCountItem[];
	rowId: string;
	showZeroValues?: boolean;
}

function buildTooltipContent(item: StatusCountItem): React.ReactNode {
	if (!item.breakdown || item.breakdown.length === 0) {
		return (
			<Typography.Text>
				{item.label}: {item.value}
			</Typography.Text>
		);
	}

	const nonZeroBreakdown = item.breakdown.filter((b) => b.value > 0);
	if (nonZeroBreakdown.length === 0) {
		return (
			<div className={styles.tooltipContent}>
				<Typography.Text className={styles.tooltipHeader}>
					{item.label}
				</Typography.Text>

				<Typography.Text>No errors</Typography.Text>
			</div>
		);
	}

	return (
		<div className={styles.tooltipContent}>
			<Typography.Text className={styles.tooltipHeader}>
				{item.label}
			</Typography.Text>
			{nonZeroBreakdown.map((b) => (
				<div key={b.label} className={styles.tooltipRow}>
					<Typography.Text>{b.label}</Typography.Text>
					<Typography.Text className={styles.tooltipValue}>
						{b.value}
					</Typography.Text>
				</div>
			))}
		</div>
	);
}

export function GroupedStatusCounts({
	items,
	rowId,
	showZeroValues = true,
}: GroupedStatusCountsProps): JSX.Element {
	const visibleItems =
		showZeroValues === false ? items.filter((item) => item.value > 0) : items;

	if (visibleItems.length === 0) {
		return <TanStackTable.Text>-</TanStackTable.Text>;
	}

	return (
		<div className={styles.container}>
			{visibleItems.map((item) => (
				<TanStackTable.HoverTooltip
					key={item.label}
					rowId={rowId}
					title={buildTooltipContent(item)}
					arrow
					align="start"
				>
					<TanStackTable.Text
						className={styles.item}
						style={{ '--gsc-color': item.color } as React.CSSProperties}
					>
						{item.value || '-'}
					</TanStackTable.Text>
				</TanStackTable.HoverTooltip>
			))}
		</div>
	);
}
