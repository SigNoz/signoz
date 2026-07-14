import { TooltipSimple } from '@signozhq/ui/tooltip';

import styles from './GroupedStatusCounts.module.scss';
import TanStackTable from 'components/TanStackTableView';

export interface StatusCountItem {
	value: number;
	label: string;
	color: string;
}

interface GroupedStatusCountsProps {
	items: StatusCountItem[];
	showZeroValues?: boolean;
}

export function GroupedStatusCounts({
	items,
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
				<div key={item.label} className={styles.itemWrapper}>
					<div
						className={styles.separator}
						style={{ backgroundColor: item.color }}
					/>
					<TooltipSimple title={`${item.label}: ${item.value}`}>
						<span>
							<TanStackTable.Text className={styles.value}>
								{item.value || '-'}
							</TanStackTable.Text>
						</span>
					</TooltipSimple>
				</div>
			))}
		</div>
	);
}
