import { Typography } from '@signozhq/ui/typography';
import { Spin } from 'antd';
import { MetricreductionruletypesGettableReductionRulePreviewDTO } from 'api/generated/services/sigNoz.schemas';

import { formatCompact } from './configUtils';
import { RuleMode } from './types';
import styles from './VolumeControlConfig.module.scss';

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

	return (
		<div className={styles.impact} data-testid="volume-control-impact">
			{isLoading && <Spin size="small" />}
			{!isLoading && preview && (
				<div className={styles.meters}>
					<div className={styles.meter}>
						<span className={styles.meterLabel}>Ingested series</span>
						<span className={styles.meterValue}>
							{formatCompact(preview.ingestedSeries)}
						</span>
					</div>
					<div className={styles.meter}>
						<span className={styles.meterLabel}>Reduced series</span>
						<span className={styles.meterValue}>
							{formatCompact(preview.reducedSeries)}
						</span>
					</div>
					<div className={styles.meter}>
						<span className={styles.meterLabel}>Reduction</span>
						<span className={`${styles.meterValue} ${styles.meterValueGood}`}>
							−{Math.round(preview.reductionPercent)}%
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
