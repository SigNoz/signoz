// oxlint-disable jsx-a11y/click-events-have-key-events
import styles from './GroupedStatusCounts.module.scss';
import TanStackTable from 'components/TanStackTableView';
import { Typography } from '@signozhq/ui/typography';
import { TextNoData } from './TextNoData';
import { MouseEventHandler } from 'react';

export interface StatusBreakdownItem {
	label: string;
	value: number;
	/** The status values this row stands for, for click-to-filter. */
	statuses?: string[];
}

export interface StatusCountItem {
	value: number;
	label: string;
	color: string;
	breakdown?: StatusBreakdownItem[];
	/** The status values this count stands for, for click-to-filter. */
	statuses?: string[];
}

interface GroupedStatusCountsProps {
	items: StatusCountItem[];
	rowId: string;
	showZeroValues?: boolean;
	/** Omit to leave the counts inert, as on entities with no status filter. */
	onSelectStatuses?: (statuses: string[]) => void;
}

function buildTooltipContent(
	item: StatusCountItem,
	onSelectStatuses?: (statuses: string[]) => void,
): React.ReactNode {
	const onClickHandle: MouseEventHandler = (e) => {
		e.preventDefault();
		e.stopPropagation();
	};

	if (!item.breakdown || item.breakdown.length === 0) {
		return (
			<div onClick={onClickHandle}>
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					{item.label}: {item.value}
				</Typography>
			</div>
		);
	}

	const nonZeroBreakdown = item.breakdown.filter((b) => b.value > 0);
	if (nonZeroBreakdown.length === 0) {
		return (
			<div className={styles.tooltipContent} onClick={onClickHandle}>
				<Typography
					variant="paragraph"
					size="base"
					weight="bold"
					color="inherit"
					as="span"
					display="inline-block"
					marginBottom={1}
					textOverflow="wrap"
				>
					{item.label}
				</Typography>

				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					No errors
				</Typography>
			</div>
		);
	}

	return (
		<div className={styles.tooltipContent} onClick={onClickHandle}>
			<Typography
				variant="paragraph"
				size="base"
				weight="bold"
				color="inherit"
				as="span"
				display="inline-block"
				marginBottom={1}
				textOverflow="wrap"
			>
				{item.label}
			</Typography>
			{nonZeroBreakdown.map((b) =>
				onSelectStatuses && b.statuses?.length ? (
					<button
						key={b.label}
						type="button"
						className={`${styles.tooltipRow} ${styles.tooltipRowSelectable}`}
						data-testid={`status-breakdown-${b.statuses.join('-')}`}
						onClick={(e): void => {
							e.preventDefault();
							e.stopPropagation();
							onSelectStatuses(b.statuses as string[]);
						}}
					>
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							{b.label}
						</Typography>
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
							tabularNumbers
						>
							{b.value}
						</Typography>
					</button>
				) : (
					<div key={b.label} className={styles.tooltipRow}>
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							{b.label}
						</Typography>
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
							tabularNumbers
						>
							{b.value}
						</Typography>
					</div>
				),
			)}
		</div>
	);
}

export function GroupedStatusCounts({
	items,
	rowId,
	showZeroValues = true,
	onSelectStatuses,
}: GroupedStatusCountsProps): JSX.Element {
	const visibleItems =
		showZeroValues === false ? items.filter((item) => item.value > 0) : items;

	if (visibleItems.length === 0) {
		return <TextNoData type="tanstack" />;
	}

	return (
		<div className={styles.container} data-testid="grouped-status-counts">
			{visibleItems.map((item) => (
				<TanStackTable.HoverTooltip
					key={item.label}
					rowId={rowId}
					title={buildTooltipContent(item, onSelectStatuses)}
					align="start"
				>
					{item.value ? (
						<TanStackTable.Text
							className={`${styles.item} ${
								onSelectStatuses && item.statuses?.length ? styles.itemSelectable : ''
							}`}
							style={{ '--gsc-color': item.color } as React.CSSProperties}
							data-testid={
								item.statuses?.length
									? `status-count-${item.statuses.join('-')}`
									: undefined
							}
							onClick={
								onSelectStatuses && item.statuses?.length
									? (e: React.MouseEvent): void => {
											e.preventDefault();
											e.stopPropagation();
											onSelectStatuses(item.statuses as string[]);
										}
									: undefined
							}
						>
							{item.value}
						</TanStackTable.Text>
					) : (
						<TextNoData
							type="tanstack"
							className={styles.item}
							style={{ '--gsc-color': item.color } as React.CSSProperties}
						/>
					)}
				</TanStackTable.HoverTooltip>
			))}
		</div>
	);
}
