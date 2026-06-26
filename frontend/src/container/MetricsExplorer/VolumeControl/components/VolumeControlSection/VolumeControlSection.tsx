import { Gauge } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import { Skeleton } from 'antd';
import { useListMetricReductionRules } from 'api/generated/services/metrics';
import { useVolumeControlFeatureGate } from 'hooks/metricsExplorer/useVolumeControlFeatureGate';
import { useState } from 'react';

import NoRuleEmptyState from './NoRuleEmptyState/NoRuleEmptyState';
import PendingActivationBanner from './PendingActivationBanner/PendingActivationBanner';
import RuleSummaryCard from './RuleSummaryCard/RuleSummaryCard';
import VolumeControlConfigDrawer from '../VolumeControlConfigDrawer/VolumeControlConfigDrawer';
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

	const { data, isLoading, error } = useListMetricReductionRules(
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

	const rule = data?.data.rules?.[0];
	const hasRule = !!rule && !error;

	const openConfig = (): void => setIsConfigOpen(true);
	const closeConfig = (): void => setIsConfigOpen(false);

	return (
		<div className={styles.section} data-testid="volume-control-section">
			<div className={styles.header}>
				<Gauge size={14} />
				<Typography.Text size="sm" weight="semibold" className={styles.title}>
					Volume control
				</Typography.Text>
			</div>

			{isLoading && <Skeleton active title={false} paragraph={{ rows: 2 }} />}

			{!isLoading && hasRule && rule && !rule.active && (
				<PendingActivationBanner />
			)}

			{!isLoading && hasRule && rule && (
				<RuleSummaryCard
					rule={rule}
					canManage={canManageVolumeControl}
					onEdit={openConfig}
				/>
			)}

			{!isLoading && !hasRule && (
				<NoRuleEmptyState canManage={canManageVolumeControl} onSetup={openConfig} />
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
