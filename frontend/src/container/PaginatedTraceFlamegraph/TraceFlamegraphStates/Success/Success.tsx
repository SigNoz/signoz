/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './Success.styles.scss';

import { Tooltip } from 'antd';
import { Dispatch, SetStateAction, useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { ListRange, Virtuoso } from 'react-virtuoso';
import { FlamegraphSpan } from 'types/api/trace/getTraceFlamegraph';

interface ITraceMetadata {
	startTime: number;
	endTime: number;
}

interface ISuccessProps {
	spans: FlamegraphSpan[][];
	setLevel: Dispatch<SetStateAction<number>>;
	traceMetadata: ITraceMetadata;
}

function Success(props: ISuccessProps): JSX.Element {
	const { spans, setLevel, traceMetadata } = props;
	const { search } = useLocation();
	const history = useHistory();
	const renderSpanLevel = useCallback(
		(_: number, spans: FlamegraphSpan[]): JSX.Element => (
			<div className="flamegraph-row">
				{spans.map((span) => {
					const spread = traceMetadata.endTime - traceMetadata.startTime;
					const leftOffset =
						((span.timestamp - traceMetadata.startTime) * 100) / spread;
					let width = ((span.durationNano / 1e6) * 100) / spread;
					if (width > 100) {
						width = 100;
					}
					const toolTipText = `${span.name}`;
					const searchParams = new URLSearchParams(search);
					return (
						<Tooltip title={toolTipText} key={span.spanId}>
							<div
								className="span-item"
								style={{ left: `${leftOffset}%`, width: `${width}%` }}
								onClick={(event): void => {
									event.stopPropagation();
									event.preventDefault();
									searchParams.set('spanId', span.spanId);
									history.replace({ search: searchParams.toString() });
								}}
							/>
						</Tooltip>
					);
				})}
			</div>
		),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[traceMetadata.endTime, traceMetadata.startTime],
	);

	const handleRangeChanged = useCallback(
		(range: ListRange) => {
			// if there are less than 50 levels on any load that means a single API call is sufficient
			if (spans.length <= 50) {
				return;
			}

			const { startIndex, endIndex } = range;
			if (startIndex === 0) {
				setLevel(spans[0][0].level);
			}

			if (endIndex === spans.length - 1) {
				setLevel(spans[spans.length - 1][spans.length - 1].level);
			}
		},
		[setLevel, spans],
	);
	return (
		<div className="trace-flamegraph">
			<Virtuoso
				height="40vh"
				className="trace-flamegraph-virtuoso"
				data={spans}
				itemContent={renderSpanLevel}
				rangeChanged={handleRangeChanged}
			/>
		</div>
	);
}

export default Success;
