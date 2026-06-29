import { Typography } from '@signozhq/ui/typography';
import { Spin } from 'antd';
import { MetricreductionruletypesGettableReductionRulePreviewDTO } from 'api/generated/services/sigNoz.schemas';

import { formatCompact } from '../../../configUtils';
import { RuleMode } from '../../../types';
import styles from './ImpactPanel.module.scss';

interface ImpactPanelProps {
	mode: RuleMode;
	preview?: MetricreductionruletypesGettableReductionRulePreviewDTO;
	isLoading: boolean;
}

function ImpactPanel({
	mode,
	preview,
	isLoading,
}: ImpactPanelProps): JSX.Element {
	if (mode === 'all') {
		return (
			<div className={styles.impactPanel} data-testid="volume-control-impact">
				<Typography.Text size="small" color="muted">
					All attributes remain queryable, no reduction.
				</Typography.Text>
			</div>
		);
	}

	const current = preview?.currentRetainedSeries ?? 0;
	const proposed = preview?.retainedSeries ?? 0;
	const deltaPct = current > 0 ? (1 - proposed / current) * 100 : 0;
	const reductionLabel = `${deltaPct >= 0 ? '−' : '+'}${Math.round(
		Math.abs(deltaPct),
	)}%`;

	return (
		<div className={styles.impactPanel} data-testid="volume-control-impact">
			{isLoading && <Spin size="small" />}
			{!isLoading && preview && (
				<div className={styles.meterGrid}>
					<div className={styles.meter}>
						<Typography.Text size="xs" color="muted" className={styles.meterLabel}>
							Current series
						</Typography.Text>
						<Typography.Text size="2xl" className={styles.meterValue}>
							{formatCompact(current)}
						</Typography.Text>
					</div>
					<div className={styles.meter}>
						<Typography.Text size="xs" color="muted" className={styles.meterLabel}>
							Proposed series
						</Typography.Text>
						<Typography.Text size="2xl" className={styles.meterValue}>
							{formatCompact(proposed)}
						</Typography.Text>
					</div>
					<div className={styles.meter}>
						<Typography.Text size="xs" color="muted" className={styles.meterLabel}>
							Reduction
						</Typography.Text>
						<Typography.Text
							size="2xl"
							color={deltaPct >= 0 ? 'success' : undefined}
							className={styles.meterValue}
						>
							{reductionLabel}
						</Typography.Text>
					</div>
				</div>
			)}
			{!isLoading && !preview && (
				<Typography.Text size="small" color="muted">
					Select attributes to preview the impact.
				</Typography.Text>
			)}
		</div>
	);
}

export default ImpactPanel;
