import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@signozhq/ui/button';
import {
	TooltipRoot,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
import { Skeleton } from 'antd';
import cx from 'classnames';
import FieldsSelector from 'components/FieldsSelector';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import history, { hasInAppHistory } from 'lib/history';
import { ArrowLeft, ChartPie } from '@signozhq/icons';
import KeyValueLabel from 'periscope/components/KeyValueLabel';
import { TraceDetailV3URLProps } from 'types/api/trace/getTraceV3';
import { DataSource } from 'types/common/queryBuilder';

import { TraceDetailsTab } from '../constants';
import { TraceDetailEventKeys, TraceDetailEvents } from '../events';
import { useTraceDetailLogEvent } from '../hooks/useTraceDetailLogEvent';
import { useTraceDetailsTab } from '../hooks/useTraceDetailsTab';
import { useTraceStore } from '../stores/traceStore';
import TraceDownloadPanel from './TraceDownloadPanel';
import EntityMetadataRow from '../EntityMetadata/EntityMetadataRow';
import AnalyticsPanel from '../SpanDetailsPanel/AnalyticsPanel/AnalyticsPanel';
import Filters from '../TraceWaterfall/TraceWaterfallStates/Success/Filters/Filters';
import { useTraceDetailsStripInfo } from '../useTraceDetailsStripInfo';
import MissingSpansBanner from './MissingSpansBanner';
import { useTraceSummary } from './useTraceSummary';
import TraceDetailsTabs from './TraceDetailsTabs';
import TraceOptionsMenu from './TraceOptionsMenu';

import styles from './TraceDetailsHeader.module.scss';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';

interface TraceDetailsHeaderProps {
	onFilteredSpansChange?: (spanIds: string[], isFilterActive: boolean) => void;
	showTraceDetailsHeaderOptions?: boolean;
}

const SKELETON_COUNT = 3;

function DetailsLoader(): JSX.Element {
	return (
		<>
			{Array.from({ length: SKELETON_COUNT }).map((_, i) => (
				<Skeleton.Input
					// eslint-disable-next-line react/no-array-index-key
					key={i}
					active
					size="small"
					className={styles.skeleton}
				/>
			))}
		</>
	);
}

function TraceDetailsHeader({
	onFilteredSpansChange,
	showTraceDetailsHeaderOptions,
}: TraceDetailsHeaderProps): JSX.Element {
	const { id: traceID } = useParams<TraceDetailV3URLProps>();
	const [showTraceDetails, setShowTraceDetails] = useState(true);
	const [isFilterExpanded, setIsFilterExpanded] = useState(false);
	const [isPreviewFieldsOpen, setIsPreviewFieldsOpen] = useState(false);
	const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
	const { data: traceSummary } = useTraceSummary(traceID || '');
	const [tab] = useTraceDetailsTab();
	const isOverview = tab === TraceDetailsTab.Overview;

	// Overview-only panels must not linger over another tab.
	useEffect(() => {
		setIsPreviewFieldsOpen(false);
		setIsAnalyticsOpen(false);
	}, [tab]);
	const previewFields = useTraceStore((s) => s.previewFields);
	const setPreviewFields = useTraceStore((s) => s.setPreviewFields);

	const logTraceEvent = useTraceDetailLogEvent('v3', traceID || '');

	const handleToggleAnalytics = useCallback((): void => {
		logTraceEvent(TraceDetailEvents.AnalyticsPanelToggled, {
			[TraceDetailEventKeys.Open]: !isAnalyticsOpen,
		});
		setIsAnalyticsOpen((prev) => !prev);
	}, [logTraceEvent, isAnalyticsOpen]);

	const handleAnalyticsTabChange = useCallback(
		(tab: string): void => {
			logTraceEvent(TraceDetailEvents.AnalyticsTabChanged, {
				[TraceDetailEventKeys.Tab]: tab,
			});
		},
		[logTraceEvent],
	);

	const handlePreviousBtnClick = useCallback((): void => {
		if (hasInAppHistory()) {
			history.goBack();
		} else {
			history.push(ROUTES.TRACES_EXPLORER);
		}
	}, []);

	const handleToggleTraceDetails = useCallback((): void => {
		setShowTraceDetails((prev) => !prev);
	}, []);

	useTraceDetailsStripInfo({
		totalSpansCount: traceSummary?.totalSpansCount ?? 0,
		totalErrorSpansCount: traceSummary?.totalErrorSpansCount ?? 0,
	});

	const startTime = (traceSummary?.startTimestampMillis ?? 0) / 1e3;
	const endTime = (traceSummary?.endTimestampMillis ?? 0) / 1e3;

	return (
		<div className={styles.wrapper}>
			<div className={styles.header}>
				{!isFilterExpanded && (
					<div className={styles.traceIdSection}>
						<Button
							variant="solid"
							color="secondary"
							size="icon"
							className={styles.backBtn}
							onClick={handlePreviousBtnClick}
							aria-label="Back"
						>
							<ArrowLeft size={14} />
						</Button>
						<KeyValueLabel
							badgeKey="Trace ID"
							badgeValue={traceID || ''}
							maxCharacters={100}
						/>
						<TraceDetailsTabs />
					</div>
				)}
				{isOverview && showTraceDetailsHeaderOptions && traceSummary && (
					<div
						className={cx(
							styles.filterSection,
							isFilterExpanded && styles.isExpanded,
						)}
					>
						{!isFilterExpanded && (
							<TooltipProvider>
								<div className={styles.headerActions}>
									<TooltipRoot>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												color="secondary"
												aria-label="Analytics"
												onClick={handleToggleAnalytics}
											>
												<ChartPie size={14} />
											</Button>
										</TooltipTrigger>
										<TooltipContent>Analytics</TooltipContent>
									</TooltipRoot>
									<TraceOptionsMenu
										showTraceDetails={showTraceDetails}
										onToggleTraceDetails={handleToggleTraceDetails}
										onOpenPreviewFields={(): void => setIsPreviewFieldsOpen(true)}
										traceId={traceID || ''}
										startTime={startTime}
										endTime={endTime}
										totalSpansCount={traceSummary.totalSpansCount}
									/>
								</div>
							</TooltipProvider>
						)}
						<div
							key="filter"
							className={cx(styles.filter, isFilterExpanded && styles.isExpanded)}
						>
							<Filters
								startTime={startTime}
								endTime={endTime}
								traceID={traceID || ''}
								onFilteredSpansChange={onFilteredSpansChange}
								isExpanded={isFilterExpanded}
								onExpand={(): void => setIsFilterExpanded(true)}
								onCollapse={(): void => setIsFilterExpanded(false)}
							/>
						</div>
					</div>
				)}
			</div>

			{(showTraceDetails || !isOverview) && (
				<div className={styles.subHeader}>
					{!traceSummary ? (
						<DetailsLoader />
					) : (
						<EntityMetadataRow
							entity="trace"
							service={{
								name: traceSummary.rootServiceName,
								entryPoint: traceSummary.rootServiceEntryPoint,
							}}
							durationMs={
								traceSummary.endTimestampMillis - traceSummary.startTimestampMillis
							}
							timestamp={dayjs(traceSummary.startTimestampMillis).format(
								DATE_TIME_FORMATS.DD_MMM_YYYY_HH_MM_SS,
							)}
							statusCode={traceSummary.rootSpanStatusCode}
							tokens={traceSummary.ai?.tokens}
							cost={traceSummary.ai?.totalCost}
						/>
					)}
				</div>
			)}

			{isOverview && traceSummary?.hasMissingSpans && <MissingSpansBanner />}

			<FieldsSelector
				isOpen={isPreviewFieldsOpen}
				title="Preview fields"
				fields={previewFields}
				onFieldsChange={setPreviewFields}
				onClose={(): void => setIsPreviewFieldsOpen(false)}
				signal={DataSource.TRACES}
				maxFields={10}
			/>

			<AnalyticsPanel
				isOpen={isAnalyticsOpen}
				onClose={(): void => setIsAnalyticsOpen(false)}
				onTabChange={handleAnalyticsTabChange}
			/>

			<TraceDownloadPanel />
		</div>
	);
}

export default TraceDetailsHeader;
