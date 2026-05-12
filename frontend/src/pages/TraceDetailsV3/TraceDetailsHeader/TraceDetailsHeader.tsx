import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@signozhq/ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
import { Skeleton } from 'antd';
import setLocalStorageKey from 'api/browser/localstorage/set';
import HttpStatusBadge from 'components/HttpStatusBadge/HttpStatusBadge';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import dayjs from 'dayjs';
import history from 'lib/history';
import {
	ArrowLeft,
	CalendarClock,
	ChartPie,
	Server,
	Timer,
} from '@signozhq/icons';
import { FloatingPanel } from 'periscope/components/FloatingPanel';
import KeyValueLabel from 'periscope/components/KeyValueLabel';
import { TraceDetailV2URLProps } from 'types/api/trace/getTraceV2';
import { DataSource } from 'types/common/queryBuilder';

import FieldsSettings from '../components/FieldsSettings/FieldsSettings';
import { useTraceStore } from '../stores/traceStore';
import AnalyticsPanel from '../SpanDetailsPanel/AnalyticsPanel/AnalyticsPanel';
import Filters from '../TraceWaterfall/TraceWaterfallStates/Success/Filters/Filters';
import TraceOptionsMenu from './TraceOptionsMenu';

import './TraceDetailsHeader.styles.scss';
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
					className="trace-details-header__skeleton"
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

	const handleSwitchToOldView = useCallback((): void => {
		setLocalStorageKey(LOCALSTORAGE.TRACE_DETAILS_PREFER_OLD_VIEW, 'true');
		const oldUrl = `/trace-old/${traceID}${window.location.search}`;
		history.replace(oldUrl);
	}, [traceID]);

	const handlePreviousBtnClick = useCallback((): void => {
		const isSpaNavigate =
			document.referrer &&
			// oxlint-disable-next-line signoz/no-raw-absolute-path
			new URL(document.referrer).origin === window.location.origin;
		const hasBackHistory = window.history.length > 1;

		if (isSpaNavigate && hasBackHistory) {
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
		<div className="trace-details-header-wrapper">
			<div className="trace-details-header">
				{!isFilterExpanded && (
					<>
						<Button
							variant="solid"
							color="secondary"
							size="md"
							className="trace-details-header__back-btn"
							onClick={handlePreviousBtnClick}
						>
							<ArrowLeft size={14} />
						</Button>
						<KeyValueLabel
							badgeKey="Trace ID"
							badgeValue={traceID || ''}
							maxCharacters={100}
						/>
					</>
				)}
				{isDataLoaded && (
					<>
						{!isFilterExpanded && (
							<>
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												color="secondary"
												className="trace-details-header__analytics-btn"
												onClick={(): void => setIsAnalyticsOpen((prev) => !prev)}
											>
												<ChartPie size={14} />
											</Button>
										</TooltipTrigger>
										<TooltipContent>Analytics</TooltipContent>
									</Tooltip>
								</TooltipProvider>
								<TraceOptionsMenu
									showTraceDetails={showTraceDetails}
									onToggleTraceDetails={handleToggleTraceDetails}
									onOpenPreviewFields={(): void => setIsPreviewFieldsOpen(true)}
								/>
							</>
						)}
						<div
							className={`trace-details-header__filter${
								isFilterExpanded ? ' trace-details-header__filter--expanded' : ''
							}`}
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
						{!isFilterExpanded && (
							<Button
								variant="solid"
								color="secondary"
								size="sm"
								className="trace-details-header__old-view-btn"
								onClick={handleSwitchToOldView}
							>
								Legacy View
							</Button>
						)}
					</>
				)}
			</div>

			{showTraceDetails && (
				<div className="trace-details-header__sub-header">
					{traceMetadata ? (
						<>
							<span className="trace-details-header__sub-item">
								<Server size={13} />
								{traceMetadata.rootServiceName}
								<span className="trace-details-header__separator">—</span>
								<span className="trace-details-header__entry-point-badge">
									{traceMetadata.rootServiceEntryPoint}
								</span>
							</span>
							<span className="trace-details-header__sub-item">
								<Timer size={13} />
								{parseFloat(formattedDuration.toFixed(2))} {timeUnitName}
							</span>
							<span className="trace-details-header__sub-item">
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

			{isPreviewFieldsOpen && (
				<FloatingPanel
					isOpen
					width={350}
					height={window.innerHeight - 100}
					defaultPosition={{
						x: window.innerWidth - 350 - 100,
						y: 50,
					}}
					enableResizing={false}
				>
					<FieldsSettings
						title="Preview fields"
						fields={previewFields}
						onFieldsChange={setPreviewFields}
						onClose={(): void => setIsPreviewFieldsOpen(false)}
						dataSource={DataSource.TRACES}
					/>
				</FloatingPanel>
			)}

			<AnalyticsPanel
				isOpen={isAnalyticsOpen}
				onClose={(): void => setIsAnalyticsOpen(false)}
			/>
		</div>
	);
}

export default TraceDetailsHeader;
