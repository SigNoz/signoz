import './TraceMetadata.styles.scss';

import { Button, Tooltip, Typography } from 'antd';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import {
	ArrowLeft,
	BetweenHorizonalStart,
	CalendarClock,
	DraftingCompass,
	Timer,
} from 'lucide-react';
import { formatEpochTimestamp } from 'utils/timeUtils';

export interface ITraceMetadataProps {
	traceID: string;
	rootServiceName: string;
	rootSpanName: string;
	startTime: number;
	duration: number;
	totalSpans: number;
	totalErrorSpans: number;
	notFound: boolean;
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
	} = props;
	return (
		<div className="trace-metadata">
			<section className="metadata-info">
				<div className="first-row">
					<Button className="previous-btn">
						<ArrowLeft
							size={14}
							onClick={(): void => history.push(ROUTES.TRACES_EXPLORER)}
						/>
					</Button>
					<div className="trace-name">
						<DraftingCompass size={14} className="drafting" />
						<Typography.Text className="trace-id">Trace ID</Typography.Text>
					</div>
					<Typography.Text className="trace-id-value">{traceID}</Typography.Text>
				</div>
				{!notFound && (
					<div className="second-row">
						<div className="service-entry-info">
							<BetweenHorizonalStart size={14} />
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
								{formatEpochTimestamp(startTime * 1000)}
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
