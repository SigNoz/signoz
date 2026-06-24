import { useCallback, useState } from 'react';
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
import HttpStatusBadge from 'components/HttpStatusBadge/HttpStatusBadge';
import ROUTES from 'constants/routes';
import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import dayjs from 'dayjs';
import history, { hasInAppHistory } from 'lib/history';
import {
	ArrowLeft,
	CalendarClock,
	ChartPie,
	Server,
	Timer,
} from '@signozhq/icons';
import KeyValueLabel from 'periscope/components/KeyValueLabel';
import { TraceDetailV2URLProps } from 'types/api/trace/getTraceV2';
import { DataSource } from 'types/common/queryBuilder';

import { TraceDetailEventKeys, TraceDetailEvents } from '../events';
import { useTraceDetailLogEvent } from '../hooks/useTraceDetailLogEvent';
import { useTraceStore } from '../stores/traceStore';
import AnalyticsPanel from '../SpanDetailsPanel/AnalyticsPanel/AnalyticsPanel';
import Filters from '../TraceWaterfall/TraceWaterfallStates/Success/Filters/Filters';
import TraceOptionsMenu from './TraceOptionsMenu';

import styles from './TraceDetailsHeader.module.scss';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';

interface FilterMetadata {
	startTime: number;
	endTime: number;
	traceId: string;
}

export interface TraceMetadataForHeader {
	startTimestampMillis: number;
	endTimestampMillis: number;
	rootServiceName: string;
	rootServiceEntryPoint: string;
	rootSpanStatusCode: string;
}

interface TraceDetailsHeaderProps {
	filterMetadata: FilterMetadata;
	onFilteredSpansChange: (spanIds: string[], isFilterActive: boolean) => void;
	isDataLoaded?: boolean;
	traceMetadata?: TraceMetadataForHeader;
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
	filterMetadata,
	onFilteredSpansChange,
	isDataLoaded,
	traceMetadata,
}: TraceDetailsHeaderProps): JSX.Element {
	const { id: traceID } = useParams<TraceDetailV2URLProps>();
	const [showTraceDetails, setShowTraceDetails] = useState(true);
	const [isFilterExpanded, setIsFilterExpanded] = useState(false);
	const [isPreviewFieldsOpen, setIsPreviewFieldsOpen] = useState(false);
	const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
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

	const durationMs = traceMetadata
		? traceMetadata.endTimestampMillis - traceMetadata.startTimestampMillis
		: 0;
	const { time: formattedDuration, timeUnitName } =
		convertTimeToRelevantUnit(durationMs);

	return (
		<div className={styles.wrapper}>
			<div className={styles.header}>
				{!isFilterExpanded && (
					<div className={styles.traceIdSection}>
						<Button
							variant="solid"
							color="secondary"
							size="md"
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
					</div>
				)}
				{isDataLoaded && (
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
									/>
								</div>
							</TooltipProvider>
						)}
						<div
							key="filter"
							className={cx(styles.filter, isFilterExpanded && styles.isExpanded)}
						>
							<Filters
								startTime={filterMetadata.startTime}
								endTime={filterMetadata.endTime}
								traceID={filterMetadata.traceId}
								onFilteredSpansChange={onFilteredSpansChange}
								isExpanded={isFilterExpanded}
								onExpand={(): void => setIsFilterExpanded(true)}
								onCollapse={(): void => setIsFilterExpanded(false)}
							/>
						</div>
					</div>
				)}
			</div>

			{showTraceDetails && (
				<div className={styles.subHeader}>
					{traceMetadata ? (
						<>
							<span className={styles.subItem}>
								<Server size={13} />
								{traceMetadata.rootServiceName}
								<span className={styles.separator}>—</span>
								<span className={styles.entryPointBadge}>
									{traceMetadata.rootServiceEntryPoint}
								</span>
							</span>
							<span className={styles.subItem}>
								<Timer size={13} />
								{parseFloat(formattedDuration.toFixed(2))} {timeUnitName}
							</span>
							<span className={styles.subItem}>
								<CalendarClock size={13} />
								{dayjs(traceMetadata.startTimestampMillis).format(
									DATE_TIME_FORMATS.DD_MMM_YYYY_HH_MM_SS,
								)}
							</span>
							{traceMetadata.rootSpanStatusCode && (
								<HttpStatusBadge statusCode={traceMetadata.rootSpanStatusCode} />
							)}
						</>
					) : (
						<DetailsLoader />
					)}
				</div>
			)}

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
		</div>
	);
}

export default TraceDetailsHeader;
