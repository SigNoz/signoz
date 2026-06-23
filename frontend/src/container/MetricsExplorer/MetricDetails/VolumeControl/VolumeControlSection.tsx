import { Gauge, Info } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { Skeleton } from 'antd';
import { useGetMetricReductionRule } from 'api/generated/services/metrics';
import { useVolumeControlFeatureGate } from 'hooks/metricsExplorer/useVolumeControlFeatureGate';
import { useState } from 'react';

import { getLabelVerb, getMatchTypeLabel } from './utils';
import VolumeControlConfigDrawer from './VolumeControlConfigDrawer';
import styles from './VolumeControlSection.module.scss';

interface VolumeControlSectionProps {
	metricName: string;
}

function VolumeControlSection({
	metricName,
}: VolumeControlSectionProps): JSX.Element | null {
	const { isVolumeControlEnabled, canManageVolumeControl } =
		useVolumeControlFeatureGate();
	const [isConfigOpen, setIsConfigOpen] = useState(false);

	const { data, isLoading, error } = useGetMetricReductionRule(
		{ metricName },
		{
			query: {
				enabled: isVolumeControlEnabled && !!metricName,
				retry: false,
			},
		},
	);

	if (!isVolumeControlEnabled) {
		return null;
	}

	const rule = data?.data;
	const hasRule = !!rule && !error;

	const openConfig = (): void => setIsConfigOpen(true);
	const closeConfig = (): void => setIsConfigOpen(false);

	return (
		<div className={styles.section} data-testid="volume-control-section">
			<div className={styles.header}>
				<Gauge size={14} />
				<Typography.Text className={styles.title}>Volume control</Typography.Text>
			</div>

			{isLoading && <Skeleton active title={false} paragraph={{ rows: 2 }} />}

			{!isLoading && hasRule && rule && !rule.active && (
				<div
					className={styles.pendingBanner}
					data-testid="volume-control-pending-banner"
				>
					<Info size={13} />
					<Typography.Text className={styles.pendingText}>
						This metric&apos;s configuration was recently updated. Reduced volumes
						will take effect within a few minutes.
					</Typography.Text>
				</div>
			)}

			{!isLoading && hasRule && rule && (
				<div className={styles.card} data-testid="volume-control-active">
					<div className={styles.cardRow}>
						<span
							className={`${styles.statusDot} ${
								rule.active ? styles.statusActive : styles.statusPending
							}`}
						/>
						<Typography.Text className={styles.cardTitle}>
							{rule.active
								? 'Aggregation rule active'
								: 'Aggregation rule pending activation'}
						</Typography.Text>
						{canManageVolumeControl && (
							<Button
								variant="ghost"
								color="secondary"
								className={styles.editButton}
								onClick={openConfig}
								data-testid="volume-control-edit"
							>
								Edit
							</Button>
						)}
					</div>
					<Typography.Text className={styles.mode}>
						{getMatchTypeLabel(rule.matchType)}
					</Typography.Text>
					<div className={styles.chips}>
						{(rule.labels ?? []).map((label) => (
							<span className={styles.chip} key={label}>
								{getLabelVerb(rule.matchType)} {label}
							</span>
						))}
					</div>
				</div>
			)}

			{!isLoading && !hasRule && (
				<div className={styles.empty} data-testid="volume-control-empty">
					<Typography.Text className={styles.emptyText}>
						No volume control rule. All series are retained. Aggregate away
						high-cardinality attributes to reduce cost.
					</Typography.Text>
					{canManageVolumeControl && (
						<Button
							variant="solid"
							color="primary"
							className={styles.setupButton}
							onClick={openConfig}
							data-testid="volume-control-setup"
						>
							Set up volume control
						</Button>
					)}
				</div>
			)}

			{canManageVolumeControl && isConfigOpen && (
				<VolumeControlConfigDrawer
					metricName={metricName}
					existingRule={rule ?? null}
					open={isConfigOpen}
					onClose={closeConfig}
				/>
			)}
		</div>
	);
}

export default VolumeControlSection;
