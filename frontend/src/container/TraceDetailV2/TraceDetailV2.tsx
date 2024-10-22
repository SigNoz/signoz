import './TraceDetailsV2.styles.scss';

import { CaretDownFilled, CaretRightFilled } from '@ant-design/icons';
import { Typography } from 'antd';
import TimelineV2 from 'container/TimelineV2/TimelineV2';
import dayjs from 'dayjs';
import { Virtuoso } from 'react-virtuoso';
import {
	GetTraceDetailsSuccessResponse,
	SpanItem,
} from 'types/api/trace/getTraceDetails';

import { LEFT_COL_WIDTH } from './constants';

interface ITraceDetailV2Props {
	isLoadingTraceDetails: boolean;
	uncollapsedNodes: string[];
	setSpanID: React.Dispatch<React.SetStateAction<string>>;
	setUncollapsedNodes: React.Dispatch<React.SetStateAction<string[]>>;
	traceDetailsResponse?: GetTraceDetailsSuccessResponse;
}

function getSpanItemRenderer(
	index: number,
	data: SpanItem,
	uncollapsedNodes: string[],
): JSX.Element {
	return (
		<div key={index} className="span-container">
			<section
				className="span-container-details-section"
				style={{ width: `${LEFT_COL_WIDTH}px`, paddingLeft: `${data.level * 5}px` }}
			>
				<div className="span-header-row">
					{data.childrenCount > 0 && (
						<div className="span-count-collapse">
							<Typography.Text>{data.childrenCount}</Typography.Text>
							{uncollapsedNodes.includes(data.spanID) ? (
								<CaretDownFilled size={14} className="collapse-uncollapse-icon" />
							) : (
								<CaretRightFilled size={14} className="collapse-uncollapse-icon" />
							)}
						</div>
					)}
				</div>
				<div className="span-description">
					<Typography.Text className="span-name">{data.name}</Typography.Text>
					<Typography.Text className="span-service-name">
						{data.serviceName}
					</Typography.Text>
				</div>
			</section>
			<section className="span-container-duration-section">
				<Typography.Text>{data.durationNano}</Typography.Text>
			</section>
		</div>
	);
}

/**
 * 1. handle the loading gracefully here
 * 2. handle the logic to render the spans based on their level and coloring based on service name
 * 3. handle the timeline properly to show the spans decently ( timeline can be shown later as well )
 */
function TraceDetailV2(props: ITraceDetailV2Props): JSX.Element {
	const {
		traceDetailsResponse,
		setUncollapsedNodes,
		setSpanID,
		uncollapsedNodes,
		isLoadingTraceDetails,
	} = props;
	console.log({
		traceDetailsResponse,
		setUncollapsedNodes,
		setSpanID,
		isLoadingTraceDetails,
	});
	return (
		<div className="trace-details-v2-container">
			<section className="trace-details-v2-flame-graph">
				<div
					className="trace-details-metadata"
					style={{ width: `${LEFT_COL_WIDTH}px` }}
				>
					<Typography.Text className="spans-count">Total Spans</Typography.Text>
					<Typography.Text>{traceDetailsResponse?.totalSpans || 0}</Typography.Text>
				</div>
				<div className="trace-details-flame-graph">
					<Typography.Text>Flame graph comes here...</Typography.Text>
				</div>
			</section>
			<section className="timeline-graph">
				<Typography.Text
					className="global-start-time-marker"
					style={{ width: `${LEFT_COL_WIDTH}px` }}
				>
					{dayjs(traceDetailsResponse?.startTimestampMillis).format(
						'hh:mm:ss a MM/DD',
					)}
				</Typography.Text>
				<TimelineV2 />
			</section>
			<section className="trace-details-v2-waterfall-model">
				<Virtuoso
					data={traceDetailsResponse?.spans || []}
					itemContent={(index, data): React.ReactNode =>
						getSpanItemRenderer(index, data, uncollapsedNodes)
					}
					className="trace-details-v2-span-area"
				/>
			</section>
		</div>
	);
}

TraceDetailV2.defaultProps = {
	traceDetailsResponse: {},
};

export default TraceDetailV2;
