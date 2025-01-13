import './TraceMetadata.styles.scss';

import { Button, Typography } from 'antd';
import { ArrowLeft, CalendarClock, DraftingCompass, Timer } from 'lucide-react';

export interface ITraceMetadataProps {
	traceID: string;
	rootServiceName: string;
	rootSpanName: string;
	startTime: string;
	duration: string;
	totalSpans: number;
	totalErrorSpans: number;
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
	} = props;
	return (
		<div className="trace-metadata">
			<section className="metadata-info">
				<div className="first-row">
					<Button className="previous-btn">
						<ArrowLeft size={14} />
					</Button>
					<div className="trace-name">
						<DraftingCompass size={14} className="drafting" />
						<Typography.Text className="trace-id">Trace ID</Typography.Text>
					</div>
					<Typography.Text className="trace-id-value">{traceID}</Typography.Text>
				</div>
				<div className="second-row">
					<div className="service-entry-info">
						<Typography.Text className="text">{rootServiceName}</Typography.Text>
						&#8212;
						<Typography.Text className="text">{rootSpanName}</Typography.Text>
					</div>
					<div className="trace-duration">
						<Timer size={14} />
						<Typography.Text className="text">{duration}</Typography.Text>
					</div>
					<div className="start-time-info">
						<CalendarClock size={14} />
						<Typography.Text className="text">{startTime}</Typography.Text>
					</div>
				</div>
			</section>
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
		</div>
	);
}

export default TraceMetadata;
