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
			<div className={styles.impact} data-testid="volume-control-impact">
				<Typography.Text className={styles.impactNote}>
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
		<div className={styles.impact} data-testid="volume-control-impact">
			{isLoading && <Spin size="small" />}
			{!isLoading && preview && (
				<div className={styles.meters}>
					<div className={styles.meter}>
						<span className={styles.meterLabel}>Current series</span>
						<span className={styles.meterValue}>{formatCompact(current)}</span>
					</div>
					<div className={styles.meter}>
						<span className={styles.meterLabel}>Proposed series</span>
						<span className={styles.meterValue}>{formatCompact(proposed)}</span>
					</div>
					<div className={styles.meter}>
						<span className={styles.meterLabel}>Reduction</span>
						<span
							className={`${styles.meterValue} ${
								deltaPct >= 0 ? styles.meterValueGood : ''
							}`}
						>
							{reductionLabel}
						</span>
					</div>
				</div>
			)}
			{!isLoading && !preview && (
				<Typography.Text className={styles.impactNote}>
					Select attributes to preview the impact.
				</Typography.Text>
			)}
		</div>
	);
}

export default ImpactPanel;
