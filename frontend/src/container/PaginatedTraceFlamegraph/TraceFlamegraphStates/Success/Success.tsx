/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './Success.styles.scss';

import { Tooltip } from 'antd';
import Color from 'color';
import TimelineV2 from 'components/TimelineV2/TimelineV2';
import { themeColors } from 'constants/theme';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { ListRange, Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { FlamegraphSpan } from 'types/api/trace/getTraceFlamegraph';
import { Span } from 'types/api/trace/getTraceV2';

interface ITraceMetadata {
	startTime: number;
	endTime: number;
}

interface ISuccessProps {
	spans: FlamegraphSpan[][];
	firstSpanAtFetchLevel: string;
	setFirstSpanAtFetchLevel: Dispatch<SetStateAction<string>>;
	traceMetadata: ITraceMetadata;
	selectedSpan: Span | undefined;
}

function Success(props: ISuccessProps): JSX.Element {
	const {
		spans,
		setFirstSpanAtFetchLevel,
		traceMetadata,
		firstSpanAtFetchLevel,
		selectedSpan,
	} = props;
	const { search } = useLocation();
	const history = useHistory();
	const isDarkMode = useIsDarkMode();
	const virtuosoRef = useRef<VirtuosoHandle>(null);
	const [hoveredSpanId, setHoveredSpanId] = useState<string>('');
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

					let color = generateColor(span.serviceName, themeColors.traceDetailColors);

					const selectedSpanColor = isDarkMode
						? Color(color).lighten(0.7)
						: Color(color).darken(0.7);

					if (span.hasError) {
						color = `var(--bg-cherry-500)`;
					}

					return (
						<Tooltip title={toolTipText} key={span.spanId}>
							<div
								className="span-item"
								style={{
									left: `${leftOffset}%`,
									width: `${width}%`,
									backgroundColor:
										selectedSpan?.spanId === span.spanId || hoveredSpanId === span.spanId
											? `${selectedSpanColor}`
											: color,
								}}
								onMouseEnter={(): void => setHoveredSpanId(span.spanId)}
								onMouseLeave={(): void => setHoveredSpanId('')}
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
		[traceMetadata.endTime, traceMetadata.startTime, selectedSpan, hoveredSpanId],
	);

	const handleRangeChanged = useCallback(
		(range: ListRange) => {
			// if there are less than 50 levels on any load that means a single API call is sufficient
			if (spans.length < 50) {
				return;
			}

			const { startIndex, endIndex } = range;
			if (startIndex === 0 && spans[0][0].level !== 0) {
				setFirstSpanAtFetchLevel(spans[0][0].spanId);
			}

			if (endIndex === spans.length - 1) {
				setFirstSpanAtFetchLevel(spans[spans.length - 1][0].spanId);
			}
		},
		[setFirstSpanAtFetchLevel, spans],
	);

	useEffect(() => {
		const index = spans.findIndex(
			(span) => span[0].spanId === firstSpanAtFetchLevel,
		);

		virtuosoRef.current?.scrollToIndex({
			index,
			behavior: 'auto',
		});
	}, [firstSpanAtFetchLevel, spans]);

	return (
		<>
			<div className="trace-flamegraph">
				<Virtuoso
					ref={virtuosoRef}
					className="trace-flamegraph-virtuoso"
					data={spans}
					itemContent={renderSpanLevel}
					rangeChanged={handleRangeChanged}
				/>
			</div>
			<TimelineV2
				startTimestamp={traceMetadata.startTime}
				endTimestamp={traceMetadata.endTime}
				timelineHeight={22}
			/>
		</>
	);
}

export default Success;
