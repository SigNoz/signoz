import { useMemo } from 'react';
import { useLocation, useRouteMatch } from 'react-router-dom';
import { Skeleton, Tooltip } from 'antd';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import removeLocalStorageKey from 'api/browser/localstorage/remove';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import history from 'lib/history';
import {
	ArrowLeft,
	BetweenHorizontalStart,
	CalendarClock,
	DraftingCompass,
	Timer,
} from '@signozhq/icons';
import { useTimezone } from 'providers/Timezone';

import './TraceMetadata.styles.scss';

export interface ITraceMetadataProps {
	traceID: string;
	rootServiceName: string;
	rootSpanName: string;
	startTime: number;
	duration: number;
	totalSpans: number;
	totalErrorSpans: number;
	notFound: boolean;
	isDataLoading: boolean;
}

function TraceMetadata(props: ITraceMetadataProps): JSX.Element {
	const {
		traceID,
		rootServiceName,
		rootSpanName,
		startTime,
		duration,
		totalErrorSpans,
		totalSpans,
		notFound,
		isDataLoading,
	} = props;

	const { timezone } = useTimezone();

	const startTimeInMs = useMemo(
		() =>
			dayjs(startTime * 1e3)
				.tz(timezone.value)
				.format(DATE_TIME_FORMATS.DD_MMM_YYYY_HH_MM_SS),
		[startTime, timezone.value],
	);

	const handlePreviousBtnClick = (): void => {
		if (window.history.length > 1) {
			history.goBack();
		} else {
			history.push(ROUTES.TRACES_EXPLORER);
		}
	};

	const isOnOldRoute = !!useRouteMatch({
		path: ROUTES.TRACE_DETAIL_OLD,
		exact: true,
	});

	const location = useLocation();

	const handleSwitchToNewView = (): void => {
		removeLocalStorageKey(LOCALSTORAGE.TRACE_DETAILS_PREFER_OLD_VIEW);
		history.replace({
			pathname: `/trace/${traceID}`,
			search: location.search,
			hash: location.hash,
			state: location.state,
		});
	};

	return (
		<div className="trace-metadata">
			<section className="metadata-info">
				<div className="first-row">
					<Button
						variant="solid"
						color="secondary"
						size="icon"
						className="previous-btn"
						prefix={<ArrowLeft size={14} />}
						onClick={handlePreviousBtnClick}
					/>
					<div className="trace-name">
						<DraftingCompass size={14} className="drafting" />
						<Typography.Text className="trace-id">Trace ID</Typography.Text>
					</div>
					<Typography.Text className="trace-id-value">{traceID}</Typography.Text>
					{isOnOldRoute && (
						<Button
							variant="solid"
							color="primary"
							size="md"
							className="new-view-btn"
							onClick={handleSwitchToNewView}
						>
							New view
						</Button>
					)}
				</div>

				{isDataLoading && (
					<div className="second-row">
						<div className="service-entry-info">
							<BetweenHorizontalStart size={14} />
							<Skeleton.Input active className="skeleton-input" size="small" />
							<Skeleton.Input active className="skeleton-input" size="small" />
							<Skeleton.Input active className="skeleton-input" size="small" />
						</div>
					</div>
				)}
				{!isDataLoading && !notFound && (
					<div className="second-row">
						<div className="service-entry-info">
							<BetweenHorizontalStart size={14} />
							<Typography.Text className="text">{rootServiceName}</Typography.Text>
							&#8212;
							<Typography.Text className="text root-span-name">
								{rootSpanName}
							</Typography.Text>
						</div>
						<div className="trace-duration">
							<Tooltip title="Duration of trace">
								<Timer size={14} />
							</Tooltip>
							<Typography.Text className="text">
								{getYAxisFormattedValue(`${duration}`, 'ms')}
							</Typography.Text>
						</div>
						<div className="start-time-info">
							<Tooltip title="Start timestamp">
								<CalendarClock size={14} />
							</Tooltip>

							<Typography.Text className="text">
								{startTimeInMs || 'N/A'}
							</Typography.Text>
						</div>
					</div>
				)}
			</section>
			{!notFound && (
				<section className="datapoints-info">
					<div className="data-point">
						<Typography.Text className="text">Total Spans</Typography.Text>
						<Typography.Text className="value">{totalSpans}</Typography.Text>
					</div>
					<div className="separator" />
					<div className="data-point">
						<Typography.Text className="text">Error Spans</Typography.Text>
						<Typography.Text className="value">{totalErrorSpans}</Typography.Text>
					</div>
				</section>
			)}
		</div>
	);
}

export default TraceMetadata;
