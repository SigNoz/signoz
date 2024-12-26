import './Success.styles.scss';

import { Typography } from 'antd';
import { TraceWaterfallStates } from 'container/TraceWaterfall/constants';
import { useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Span } from 'types/api/trace/getTraceV2';

interface ISuccessProps {
	spans: Span[];
	traceWaterfallState: TraceWaterfallStates;
	interestedSpanId: string;
	uncollapsedNodes: string[];
	setInterestedSpanId: (val: string) => void;
	setUncollapsedNodes: (val: string[]) => void;
}

function Success(props: ISuccessProps): JSX.Element {
	const {
		spans,
		traceWaterfallState,
		interestedSpanId,
		uncollapsedNodes,
		setInterestedSpanId,
		setUncollapsedNodes,
	} = props;
	console.log(uncollapsedNodes, setInterestedSpanId, setUncollapsedNodes);

	const getItemContent = useCallback((_: number, span: Span): JSX.Element => {
		console.log(span);
		return (
			<div className="span-item">
				<Typography.Text>{span.name}</Typography.Text>;
			</div>
		);
	}, []);

	return (
		<Typography.Text>
			{traceWaterfallState ===
				TraceWaterfallStates.FETCHING_WITH_OLD_DATA_PRESENT &&
				interestedSpanId === spans[0].spanId && (
					<Typography.Text>Fetching Spans....</Typography.Text>
				)}
			<Virtuoso
				style={{ height: 400 }}
				data={spans}
				itemContent={getItemContent}
			/>
			{traceWaterfallState ===
				TraceWaterfallStates.FETCHING_WITH_OLD_DATA_PRESENT &&
				interestedSpanId === spans[spans.length - 1].spanId && (
					<Typography.Text>Fetching Spans....</Typography.Text>
				)}
		</Typography.Text>
	);
}

export default Success;
