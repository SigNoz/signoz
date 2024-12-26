import './Success.styles.scss';

import { Button, Typography } from 'antd';
import cx from 'classnames';
import {
	FIXED_LEFT_PADDING_BASE,
	TraceWaterfallStates,
} from 'container/TraceWaterfall/constants';
import { ChevronDown, ChevronRight, Leaf } from 'lucide-react';
import { Dispatch, SetStateAction, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Span } from 'types/api/trace/getTraceV2';

interface ISuccessProps {
	spans: Span[];
	traceWaterfallState: TraceWaterfallStates;
	interestedSpanId: string;
	uncollapsedNodes: string[];
	setInterestedSpanId: Dispatch<SetStateAction<string | null | undefined>>;
	setUncollapsedNodes: Dispatch<SetStateAction<string[]>>;
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

	const getItemContent = useCallback(
		(_: number, span: Span): JSX.Element => {
			const isRootSpan = span.parentSpanId === '';
			const leftMarginBeforeTheHorizontalConnector =
				span.level > 0
					? `${(span.level - 1) * (FIXED_LEFT_PADDING_BASE + 1)}px`
					: '0px';

			const isUnCollapsed = uncollapsedNodes.includes(span.spanId);
			return (
				// do not crop the service names and let the window overflow.
				// the pane height changes needs to be addressed by resizable columns
				<div
					className={cx('span-item', !isRootSpan ? 'vertical-connector' : '')}
					style={{ marginLeft: leftMarginBeforeTheHorizontalConnector }}
				>
					<div className="first-row">
						{!isRootSpan && (
							<div
								className="horizontal-connector"
								style={{ width: `${FIXED_LEFT_PADDING_BASE}px` }}
							/>
						)}
						{span.hasChildren ? (
							<Button
								icon={
									isUnCollapsed ? <ChevronDown size={14} /> : <ChevronRight size={14} />
								}
								onClick={(): void => {
									setInterestedSpanId(span.spanId);

									if (isUnCollapsed) {
										setUncollapsedNodes((prev) =>
											prev.filter((id) => id !== span.spanId),
										);
									} else {
										setUncollapsedNodes((prev) => [...prev, span.spanId]);
									}
								}}
								className="collapse-uncollapse-button"
							/>
						) : (
							<Button
								icon={<Leaf size={14} />}
								className="collapse-uncollapse-button"
							/>
						)}
						<Typography.Text>{span.name}</Typography.Text>
					</div>
					<div
						className="second-row"
						style={{
							marginLeft: !isRootSpan ? `${FIXED_LEFT_PADDING_BASE}px` : '0px',
						}}
					>
						<Typography.Text>{span.serviceName}</Typography.Text>
					</div>
				</div>
			);
		},
		[setInterestedSpanId, setUncollapsedNodes, uncollapsedNodes],
	);

	return (
		<div className="success-cotent">
			{traceWaterfallState ===
				TraceWaterfallStates.FETCHING_WITH_OLD_DATA_PRESENT &&
				interestedSpanId === spans[0].spanId && (
					<Typography.Text>Fetching Spans....</Typography.Text>
				)}
			<Virtuoso
				style={{ height: '100%' }}
				data={spans}
				itemContent={getItemContent}
			/>
			{traceWaterfallState ===
				TraceWaterfallStates.FETCHING_WITH_OLD_DATA_PRESENT &&
				interestedSpanId === spans[spans.length - 1].spanId && (
					<Typography.Text>Fetching Spans....</Typography.Text>
				)}
		</div>
	);
}

export default Success;
