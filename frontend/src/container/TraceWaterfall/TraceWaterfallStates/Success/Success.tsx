/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './Success.styles.scss';

import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { Virtualizer } from '@tanstack/react-virtual';
import { Button, Tooltip, Typography } from 'antd';
import cx from 'classnames';
import { TableV3 } from 'components/TableV3/TableV3';
import { themeColors } from 'constants/theme';
import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import { IInterestedSpan } from 'container/TraceWaterfall/TraceWaterfall';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import {
	AlertCircle,
	ArrowUpRight,
	ChevronDown,
	ChevronRight,
	Leaf,
} from 'lucide-react';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from 'react';
import { Span } from 'types/api/trace/getTraceV2';
import { toFixed } from 'utils/toFixed';

import Filters from './Filters/Filters';

// css config
const CONNECTOR_WIDTH = 28;
const VERTICAL_CONNECTOR_WIDTH = 1;

interface ITraceMetadata {
	traceId: string;
	startTime: number;
	endTime: number;
	hasMissingSpans: boolean;
}
interface ISuccessProps {
	spans: Span[];
	traceMetadata: ITraceMetadata;
	interestedSpanId: IInterestedSpan;
	uncollapsedNodes: string[];
	setInterestedSpanId: Dispatch<SetStateAction<IInterestedSpan>>;
	setTraceFlamegraphStatsWidth: Dispatch<SetStateAction<number>>;
	selectedSpan: Span | undefined;
	setSelectedSpan: Dispatch<SetStateAction<Span | undefined>>;
}

function SpanOverview({
	span,
	isSpanCollapsed,
	handleCollapseUncollapse,
	setSelectedSpan,
	selectedSpan,
}: {
	span: Span;
	isSpanCollapsed: boolean;
	handleCollapseUncollapse: (id: string, collapse: boolean) => void;
	selectedSpan: Span | undefined;
	setSelectedSpan: Dispatch<SetStateAction<Span | undefined>>;
}): JSX.Element {
	const isRootSpan = span.level === 0;

	let color = generateColor(span.serviceName, themeColors.traceDetailColors);
	if (span.hasError) {
		color = `var(--bg-cherry-500)`;
	}

	return (
		<div
			className={cx(
				'span-overview',
				selectedSpan?.spanId === span.spanId ? 'interested-span' : '',
			)}
			style={{
				paddingLeft: `${
					isRootSpan
						? span.level * CONNECTOR_WIDTH
						: (span.level - 1) * (CONNECTOR_WIDTH + VERTICAL_CONNECTOR_WIDTH)
				}px`,
				backgroundImage: `url('data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="54"><line x1="0" y1="0" x2="0" y2="54" stroke="rgb(29 33 45)" stroke-width="1" /></svg>')`,
				backgroundRepeat: 'repeat',
				backgroundSize: `${CONNECTOR_WIDTH + 1}px 54px`,
			}}
			onClick={(): void => {
				setSelectedSpan(span);
			}}
		>
			{!isRootSpan && (
				<div className="connector-lines">
					<div
						style={{
							width: `${CONNECTOR_WIDTH}px`,
							height: '1px',
							borderTop: '1px solid var(--bg-slate-400)',
							display: 'flex',
							flexShrink: 0,
							position: 'relative',
							top: '-10px',
						}}
					/>
				</div>
			)}
			<div className="span-overview-content">
				<section className="first-row">
					<div className="span-det">
						{span.hasChildren ? (
							<Button
								onClick={(event): void => {
									event.stopPropagation();
									event.preventDefault();
									handleCollapseUncollapse(span.spanId, !isSpanCollapsed);
								}}
								className="collapse-uncollapse-button"
							>
								{isSpanCollapsed ? (
									<ChevronRight size={14} />
								) : (
									<ChevronDown size={14} />
								)}
								<Typography.Text className="children-count">
									{span.subTreeNodeCount}
								</Typography.Text>
							</Button>
						) : (
							<Button className="collapse-uncollapse-button">
								<Leaf size={14} />
							</Button>
						)}
						<Typography.Text className="span-name">{span.name}</Typography.Text>
					</div>
				</section>
				<section className="second-row">
					<div style={{ width: '2px', background: color, height: '100%' }} />
					<Typography.Text className="service-name">
						{span.serviceName}
					</Typography.Text>
				</section>
			</div>
		</div>
	);
}

function SpanDuration({
	span,
	traceMetadata,
	setSelectedSpan,
	selectedSpan,
}: {
	span: Span;
	traceMetadata: ITraceMetadata;
	selectedSpan: Span | undefined;
	setSelectedSpan: Dispatch<SetStateAction<Span | undefined>>;
}): JSX.Element {
	const { time, timeUnitName } = convertTimeToRelevantUnit(
		span.durationNano / 1e6,
	);

	const spread = traceMetadata.endTime - traceMetadata.startTime;
	const leftOffset = ((span.timestamp - traceMetadata.startTime) * 1e2) / spread;
	const width = (span.durationNano * 1e2) / (spread * 1e6);

	let color = generateColor(span.serviceName, themeColors.traceDetailColors);

	if (span.hasError) {
		color = `var(--bg-cherry-500)`;
	}

	return (
		<div
			className={cx(
				'span-duration',
				selectedSpan?.spanId === span.spanId ? 'interested-span' : '',
			)}
			onClick={(): void => {
				setSelectedSpan(span);
			}}
		>
			<div
				className="span-line"
				style={{
					left: `${leftOffset}%`,
					width: `${width}%`,
					backgroundColor: color,
				}}
			/>
			<Tooltip title={`${toFixed(time, 2)} ${timeUnitName}`}>
				<Typography.Text
					className="span-line-text"
					ellipsis
					style={{ left: `${leftOffset}%`, color }}
				>{`${toFixed(time, 2)} ${timeUnitName}`}</Typography.Text>
			</Tooltip>
		</div>
	);
}

// table config
const columnDefHelper = createColumnHelper<Span>();

function getWaterfallColumns({
	handleCollapseUncollapse,
	uncollapsedNodes,
	traceMetadata,
	selectedSpan,
	setSelectedSpan,
}: {
	handleCollapseUncollapse: (id: string, collapse: boolean) => void;
	uncollapsedNodes: string[];
	traceMetadata: ITraceMetadata;
	selectedSpan: Span | undefined;
	setSelectedSpan: Dispatch<SetStateAction<Span | undefined>>;
}): ColumnDef<Span, any>[] {
	const waterfallColumns: ColumnDef<Span, any>[] = [
		columnDefHelper.display({
			id: 'span-name',
			header: '',
			cell: (props): JSX.Element => (
				<SpanOverview
					span={props.row.original}
					handleCollapseUncollapse={handleCollapseUncollapse}
					isSpanCollapsed={!uncollapsedNodes.includes(props.row.original.spanId)}
					selectedSpan={selectedSpan}
					setSelectedSpan={setSelectedSpan}
				/>
			),
			size: 450,
		}),
		columnDefHelper.display({
			id: 'span-duration',
			header: () => <div />,
			enableResizing: false,
			cell: (props): JSX.Element => (
				<SpanDuration
					span={props.row.original}
					traceMetadata={traceMetadata}
					selectedSpan={selectedSpan}
					setSelectedSpan={setSelectedSpan}
				/>
			),
		}),
	];

	return waterfallColumns;
}

function Success(props: ISuccessProps): JSX.Element {
	const {
		spans,
		traceMetadata,
		interestedSpanId,
		uncollapsedNodes,
		setInterestedSpanId,
		setTraceFlamegraphStatsWidth,
		setSelectedSpan,
		selectedSpan,
	} = props;
	const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element>>();

	const handleCollapseUncollapse = useCallback(
		(spanId: string, collapse: boolean) => {
			setInterestedSpanId({ spanId, isUncollapsed: !collapse });
		},
		[setInterestedSpanId],
	);

	const handleVirtualizerInstanceChanged = (
		instance: Virtualizer<HTMLDivElement, Element>,
	): void => {
		const { range } = instance;
		// when there are less than 500 elements in the API call that means there is nothing to fetch on top and bottom so
		// do not trigger the API call
		if (spans.length < 500) return;

		if (range?.startIndex === 0 && instance.isScrolling) {
			// do not trigger for trace root as nothing to fetch above
			if (spans[0].level !== 0) {
				setInterestedSpanId({ spanId: spans[0].spanId, isUncollapsed: false });
			}
			return;
		}

		if (range?.endIndex === spans.length - 1 && instance.isScrolling) {
			setInterestedSpanId({
				spanId: spans[spans.length - 1].spanId,
				isUncollapsed: false,
			});
		}
	};

	const columns = useMemo(
		() =>
			getWaterfallColumns({
				handleCollapseUncollapse,
				uncollapsedNodes,
				traceMetadata,
				selectedSpan,
				setSelectedSpan,
			}),
		[
			handleCollapseUncollapse,
			uncollapsedNodes,
			traceMetadata,
			selectedSpan,
			setSelectedSpan,
		],
	);

	useEffect(() => {
		if (interestedSpanId.spanId !== '' && virtualizerRef.current) {
			const idx = spans.findIndex(
				(span) => span.spanId === interestedSpanId.spanId,
			);
			if (idx !== -1) {
				setTimeout(() => {
					virtualizerRef.current?.scrollToIndex(idx, {
						align: 'center',
						behavior: 'auto',
					});
				}, 400);

				setSelectedSpan(spans[idx]);
			}
		} else {
			setSelectedSpan((prev) => {
				if (!prev) {
					return spans[0];
				}
				return prev;
			});
		}
	}, [interestedSpanId, setSelectedSpan, spans]);

	return (
		<div className="success-content">
			{traceMetadata.hasMissingSpans && (
				<div className="missing-spans">
					<section className="left-info">
						<AlertCircle size={14} />
						<Typography.Text className="text">
							This trace has missing spans
						</Typography.Text>
					</section>
					<Button
						icon={<ArrowUpRight size={14} />}
						className="right-info"
						type="text"
						onClick={(): WindowProxy | null =>
							window.open(
								'https://signoz.io/docs/userguide/traces/#missing-spans',
								'_blank',
							)
						}
					>
						Learn More
					</Button>
				</div>
			)}
			<Filters
				startTime={traceMetadata.startTime / 1e3}
				endTime={traceMetadata.endTime / 1e3}
				traceID={traceMetadata.traceId}
			/>
			<TableV3
				columns={columns}
				data={spans}
				config={{
					handleVirtualizerInstanceChanged,
				}}
				customClassName={cx(
					'waterfall-table',
					traceMetadata.hasMissingSpans ? 'missing-spans-waterfall-table' : '',
				)}
				virtualiserRef={virtualizerRef}
				setColumnWidths={setTraceFlamegraphStatsWidth}
			/>
		</div>
	);
}

export default Success;
