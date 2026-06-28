import { Info } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import { Skeleton, Tooltip } from 'antd';
import cx from 'classnames';

import { formatCompact, formatUsd } from '../../../configUtils';
import styles from './VolumeControlStats.module.scss';

interface VolumeControlStatsProps {
	activeRules: number;
	ingestedSeries: number;
	retainedSeries: number;
	ingestedSamples: number;
	retainedSamples: number;
	estimatedMonthlySavingsUsd: number;
	isLoading?: boolean;
	isError?: boolean;
}

interface StatItem {
	label: string;
	value: string;
	tooltip: string;
	delta?: string;
	unit?: string;
	highlighted?: boolean;
	valueGood?: boolean;
}

function VolumeControlStats({
	activeRules,
	ingestedSeries,
	retainedSeries,
	ingestedSamples,
	retainedSamples,
	estimatedMonthlySavingsUsd,
	isLoading = false,
	isError = false,
}: VolumeControlStatsProps): JSX.Element {
	const overallReduction =
		ingestedSeries > 0
			? Math.round((1 - retainedSeries / ingestedSeries) * 100)
			: 0;

	const sampleReduction =
		ingestedSamples > 0
			? Math.round((1 - retainedSamples / ingestedSamples) * 100)
			: 0;

	const items: StatItem[] = [
		{
			label: 'Configured rules',
			value: String(activeRules),
			tooltip: 'Volume-control rules currently configured for this workspace.',
		},
		{
			label: 'Ingested series',
			value: formatCompact(ingestedSeries),
			tooltip:
				'Distinct time series observed across active rules in the last 24 hours, from when each rule took effect, before any reduction.',
		},
		{
			label: 'Retained series',
			value: formatCompact(retainedSeries),
			delta: overallReduction > 0 ? `−${overallReduction}%` : undefined,
			tooltip:
				'Distinct time series retained after reduction across active rules over the same window. Lower means more reduction.',
		},
		{
			label: 'Ingested samples',
			value: formatCompact(ingestedSamples),
			tooltip:
				'Sample data points observed across active rules in the last 24 hours, from when each rule took effect, before any reduction.',
		},
		{
			label: 'Retained samples',
			value: formatCompact(retainedSamples),
			delta: sampleReduction > 0 ? `−${sampleReduction}%` : undefined,
			tooltip:
				'Sample data points retained after reduction across active rules over the same window. Samples reduction can exceed series reduction since series do not all contribute the same sample volume.',
		},
		{
			label: 'Est. monthly savings',
			value: formatUsd(estimatedMonthlySavingsUsd),
			unit: '/mo',
			highlighted: true,
			valueGood: true,
			tooltip:
				'Estimated from the reduced sample volume assuming 1-month standard retention.',
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
					<div className={styles.statCardLabelRow}>
						<Typography.Text size="sm" color="muted" className={styles.statCardLabel}>
							{item.label}
						</Typography.Text>
						<Tooltip title={item.tooltip}>
							<Info size={12} className={styles.statCardInfo} />
						</Tooltip>
					</div>
					{isLoading && (
						<Skeleton.Button active size="small" className={styles.statCardValue} />
					)}
					{!isLoading && isError && (
						<Typography.Text
							as="div"
							size="small"
							color="danger"
							className={styles.statCardValue}
						>
							Failed to load
						</Typography.Text>
					)}
					{!isLoading && !isError && (
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
					)}
				</div>
			))}
		</div>
	);
}

export default VolumeControlStats;
