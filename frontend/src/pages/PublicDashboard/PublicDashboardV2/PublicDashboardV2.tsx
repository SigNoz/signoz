import type { DashboardtypesGettablePublicDashboardDataV2DTO } from 'api/generated/services/sigNoz.schemas';
import { Typography } from '@signozhq/ui/typography';
import { refreshIntervalOptions } from 'container/TopNav/AutoRefreshV2/constants';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { DEFAULT_TIME_RANGE } from 'container/TopNav/DateTimeSelectionV2/constants';
import type {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import GetMinMax from 'lib/getMinMax';
import { layoutsToSections } from 'pages/DashboardPageV2/DashboardContainer/utils';
import { useMemo, useState } from 'react';
import { useInterval } from 'react-use';
import { NANO_SECOND_MULTIPLIER } from 'store/globalTime/utils';

import signozBrandLogoUrl from '@/assets/Logos/signoz-brand-logo.svg';

import PublicAutoRefresh from './PublicAutoRefresh/PublicAutoRefresh';
import PublicSectionGrid from './PublicSectionGrid/PublicSectionGrid';
import { getStartTimeAndEndTimeFromTimeRange } from './utils';
import styles from './PublicDashboardV2.module.scss';

interface PublicDashboardV2Props {
	publicDashboardId: string;
	data: DashboardtypesGettablePublicDashboardDataV2DTO;
}

// Read-only viewer for a v2 (Perses-spec) public dashboard; reuses the V2 panel renderers.
// Variables aren't rendered — the public endpoint doesn't substitute them.
function PublicDashboardV2({
	publicDashboardId,
	data,
}: PublicDashboardV2Props): JSX.Element {
	const { dashboard, publicDashboard } = data;

	const sections = useMemo(
		() => layoutsToSections(dashboard?.spec?.layouts, dashboard?.spec?.panels),
		[dashboard?.spec?.layouts, dashboard?.spec?.panels],
	);

	const [selectedTimeRangeLabel, setSelectedTimeRangeLabel] = useState<string>(
		publicDashboard?.defaultTimeRange || DEFAULT_TIME_RANGE,
	);
	const [selectedTimeRange, setSelectedTimeRange] = useState(() =>
		getStartTimeAndEndTimeFromTimeRange(
			publicDashboard?.defaultTimeRange || DEFAULT_TIME_RANGE,
		),
	);

	const isTimeRangeEnabled = publicDashboard?.timeRangeEnabled || false;

	const handleTimeChange = (
		interval: Time | CustomTimeType,
		dateTimeRange?: [number, number],
	): void => {
		if (dateTimeRange) {
			setSelectedTimeRange({
				startTime: Math.floor(dateTimeRange[0] / 1000),
				endTime: Math.floor(dateTimeRange[1] / 1000),
			});
		} else if (interval !== 'custom') {
			const { maxTime, minTime } = GetMinMax(interval);
			setSelectedTimeRange({
				startTime: Math.floor(minTime / NANO_SECOND_MULTIPLIER / 1000),
				endTime: Math.floor(maxTime / NANO_SECOND_MULTIPLIER / 1000),
			});
		}
		setSelectedTimeRangeLabel(interval as string);
	};

	const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(false);
	const [autoRefreshInterval, setAutoRefreshInterval] = useState<string>('30s');

	// Auto-refresh applies only to a rolling relative range, not a fixed custom window.
	const isAutoRefreshPaused = selectedTimeRangeLabel === 'custom';
	const refreshIntervalMs = useMemo(
		() =>
			autoRefreshEnabled
				? refreshIntervalOptions.find(
						(option) => option.key === autoRefreshInterval,
					)?.value || 0
				: 0,
		[autoRefreshEnabled, autoRefreshInterval],
	);

	useInterval(
		() => handleTimeChange(selectedTimeRangeLabel as Time),
		isAutoRefreshPaused || refreshIntervalMs === 0 ? null : refreshIntervalMs,
	);

	const handleRefresh = (): void =>
		handleTimeChange(selectedTimeRangeLabel as Time);

	const startMs = selectedTimeRange.startTime * 1000;
	const endMs = selectedTimeRange.endTime * 1000;

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<div className={styles.headerLeft}>
					<div className={styles.brand}>
						<img src={signozBrandLogoUrl} alt="SigNoz" className={styles.brandLogo} />
						<Typography className={styles.brandName}>SigNoz</Typography>
					</div>
					<Typography.Text className={styles.title}>
						{dashboard?.spec?.display?.name}
					</Typography.Text>
				</div>

				{isTimeRangeEnabled && (
					<div className={styles.headerRight}>
						<PublicAutoRefresh
							enabled={autoRefreshEnabled}
							interval={autoRefreshInterval}
							disabled={isAutoRefreshPaused}
							onToggle={setAutoRefreshEnabled}
							onIntervalChange={setAutoRefreshInterval}
							onRefresh={handleRefresh}
						/>
						<DateTimeSelectionV2
							showAutoRefresh={false}
							showRefreshText={false}
							hideShareModal
							onTimeChange={handleTimeChange}
							defaultRelativeTime={publicDashboard?.defaultTimeRange as Time}
							isModalTimeSelection
							modalSelectedInterval={selectedTimeRangeLabel as Time}
							disableUrlSync
							showRecentlyUsed={false}
							modalInitialStartTime={startMs}
							modalInitialEndTime={endMs}
						/>
					</div>
				)}
			</div>

			<div className={styles.content}>
				{sections.map((section) => (
					<section key={section.id} className={styles.section}>
						{section.title && (
							<Typography.Text className={styles.sectionTitle}>
								{section.title}
							</Typography.Text>
						)}
						<PublicSectionGrid
							items={section.items}
							publicDashboardId={publicDashboardId}
							startMs={startMs}
							endMs={endMs}
							isVisible
						/>
					</section>
				))}
			</div>
		</div>
	);
}

export default PublicDashboardV2;
