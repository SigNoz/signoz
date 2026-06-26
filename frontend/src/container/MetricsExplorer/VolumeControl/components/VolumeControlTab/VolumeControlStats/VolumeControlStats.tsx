import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import { formatCompact, formatUsd } from '../../../configUtils';
import styles from './VolumeControlStats.module.scss';

interface VolumeControlStatsProps {
	activeRules: number;
	ingestedSeries: number;
	retainedSeries: number;
	estimatedMonthlySavingsUsd: number;
}

interface StatItem {
	label: string;
	value: string;
	delta?: string;
	unit?: string;
	highlighted?: boolean;
	valueGood?: boolean;
}

function VolumeControlStats({
	activeRules,
	ingestedSeries,
	retainedSeries,
	estimatedMonthlySavingsUsd,
}: VolumeControlStatsProps): JSX.Element {
	const overallReduction =
		ingestedSeries > 0
			? Math.round((1 - retainedSeries / ingestedSeries) * 100)
			: 0;

	const items: StatItem[] = [
		{ label: 'Active rules', value: String(activeRules) },
		{ label: 'Ingested series', value: formatCompact(ingestedSeries) },
		{
			label: 'Retained series',
			value: formatCompact(retainedSeries),
			delta: overallReduction > 0 ? `−${overallReduction}%` : undefined,
		},
		{
			label: 'Est. monthly savings',
			value: formatUsd(estimatedMonthlySavingsUsd),
			unit: '/mo',
			highlighted: true,
			valueGood: true,
		},
	];

	return (
		<div className={styles.stats} data-testid="volume-control-stats">
			{items.map((item) => (
				<div
					key={item.label}
					className={cx(styles.statCard, {
						[styles.statCardHighlighted]: item.highlighted,
					})}
				>
					<Typography.Text size="sm" color="muted" className={styles.statCardLabel}>
						{item.label}
					</Typography.Text>
					<Typography.Text
						as="div"
						size="large"
						weight="semibold"
						color={item.valueGood ? 'success' : undefined}
						className={styles.statCardValue}
					>
						{item.value}
						{item.delta && (
							<Typography.Text size="small" weight="semibold" color="success">
								{item.delta}
							</Typography.Text>
						)}
						{item.unit && (
							<Typography.Text size="small" weight="medium" color="muted">
								{item.unit}
							</Typography.Text>
						)}
					</Typography.Text>
				</div>
			))}
		</div>
	);
}

export default VolumeControlStats;
