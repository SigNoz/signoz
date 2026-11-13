import { Info } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import { Spin, Tooltip } from 'antd';
import { MetricreductionruletypesGettableReductionRulePreviewDTO } from 'api/generated/services/sigNoz.schemas';
import { popupContainer } from 'utils/selectPopupContainer';

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
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="secondary"
					as="span"
					textOverflow="wrap"
				>
					All attributes remain queryable, no reduction.
				</Typography>
			</div>
		);
	}

	const full = preview?.ingestedSeries ?? 0;
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
						<div className={styles.meterLabelRow}>
							<Typography
								variant="uppercase"
								size="small"
								weight="regular"
								color="secondary"
								as="span"
								textOverflow="wrap"
							>
								Full series
							</Typography>
							<Tooltip
								title="Total number of series for this metric before any reduction."
								getPopupContainer={popupContainer}
							>
								<Info size={12} className={styles.meterInfo} />
							</Tooltip>
						</div>
						<Typography
							variant="label"
							size="large"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
							tabularNumbers
						>
							{formatCompact(full)}
						</Typography>
					</div>
					<div className={styles.meter}>
						<div className={styles.meterLabelRow}>
							<Typography
								variant="uppercase"
								size="small"
								weight="regular"
								color="secondary"
								as="span"
								textOverflow="wrap"
							>
								Current retained
							</Typography>
							<Tooltip
								title="Series kept today under the metric's existing rule, or all of them if it has no rule yet."
								getPopupContainer={popupContainer}
							>
								<Info size={12} className={styles.meterInfo} />
							</Tooltip>
						</div>
						<Typography
							variant="label"
							size="large"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
							tabularNumbers
						>
							{formatCompact(current)}
						</Typography>
					</div>
					<div className={styles.meter}>
						<div className={styles.meterLabelRow}>
							<Typography
								variant="uppercase"
								size="small"
								weight="regular"
								color="secondary"
								as="span"
								textOverflow="wrap"
							>
								Potential retained
							</Typography>
							<Tooltip
								title="Series that would be kept if you save this rule, with the reduction vs what's retained today."
								getPopupContainer={popupContainer}
							>
								<Info size={12} className={styles.meterInfo} />
							</Tooltip>
						</div>
						<Typography
							variant="label"
							size="large"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
							tabularNumbers
						>
							{formatCompact(proposed)}
							{deltaPct !== 0 && (
								<Typography
									variant="paragraph"
									size="small"
									weight="regular"
									color={deltaPct >= 0 ? 'success' : 'inherit'}
									as="span"
									textOverflow="wrap"
								>
									{reductionLabel}
								</Typography>
							)}
						</Typography>
					</div>
				</div>
			)}
			{!isLoading && !preview && (
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="secondary"
					as="span"
					textOverflow="wrap"
				>
					Select attributes to preview the impact.
				</Typography>
			)}
		</div>
	);
}

export default ImpactPanel;
