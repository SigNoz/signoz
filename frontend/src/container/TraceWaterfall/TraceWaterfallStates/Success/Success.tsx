import './Success.styles.scss';

import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { Virtualizer } from '@tanstack/react-virtual';
import { Button, Typography } from 'antd';
import cx from 'classnames';
import { TableV3 } from 'components/TableV3/TableV3';
import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import { IInterestedSpan } from 'container/TraceWaterfall/TraceWaterfall';
// import { TraceWaterfallStates } from 'container/TraceWaterfall/constants';
import { ChevronDown, ChevronRight, Leaf } from 'lucide-react';
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

// css config
const CONNECTOR_WIDTH = 28;
const VERTICAL_CONNECTOR_WIDTH = 1;

interface ITraceMetadata {
	startTime: number;
	endTime: number;
}
interface ISuccessProps {
	spans: Span[];
	traceMetadata: ITraceMetadata;
	interestedSpanId: IInterestedSpan;
	uncollapsedNodes: string[];
	setInterestedSpanId: Dispatch<SetStateAction<IInterestedSpan>>;
}

function SpanOverview({
	span,
	isSpanCollapsed,
	interestedSpanId,
	handleCollapseUncollapse,
}: {
	span: Span;
	isSpanCollapsed: boolean;
	interestedSpanId: string;
	handleCollapseUncollapse: (id: string, collapse: boolean) => void;
}): JSX.Element {
	const isRootSpan = span.parentSpanId === '';
	const spanRef = useRef<HTMLDivElement>(null);

	return (
		<div
			ref={spanRef}
			className={cx(
				'span-overview',
				interestedSpanId === span.spanId ? 'interested-span' : '',
			)}
			style={{
				marginLeft: `${
					isRootSpan
						? span.level * CONNECTOR_WIDTH
						: (span.level - 1) * (CONNECTOR_WIDTH + VERTICAL_CONNECTOR_WIDTH)
				}px`,
				borderLeft: isRootSpan ? 'none' : `1px solid lightgray`,
			}}
		>
			{!isRootSpan && (
				<div
					style={{
						width: `${CONNECTOR_WIDTH}px`,
						height: '1px',
						border: '1px solid lightgray',
						display: 'flex',
						flexShrink: 0,
						position: 'relative',
						top: '-10px',
					}}
				/>
			)}
			<div className="span-overview-content">
				<section className="first-row">
					{span.hasChildren ? (
						<Button
							onClick={(): void =>
								handleCollapseUncollapse(span.spanId, !isSpanCollapsed)
							}
							className="collapse-uncollapse-button"
						>
							{isSpanCollapsed ? (
								<ChevronRight size={14} />
							) : (
								<ChevronDown size={14} />
							)}
							<Typography.Text className="children-count">XX</Typography.Text>
						</Button>
					) : (
						<Button className="collapse-uncollapse-button">
							<Leaf size={14} />
						</Button>
					)}
					<Typography.Text className="span-name">{span.name}</Typography.Text>
				</section>
				<section className="second-row">
					<div style={{ width: '1px', background: 'lightgray', height: '100%' }} />
					<Typography.Text className="service-name">
						{span.serviceName}
					</Typography.Text>
					<Typography.Text>.</Typography.Text>
					<Typography.Text>XX data</Typography.Text>
				</section>
			</div>
		</div>
	);
}

function SpanDuration({
	span,
	interestedSpanId,
	traceMetadata,
}: {
	span: Span;
	interestedSpanId: string;
	traceMetadata: ITraceMetadata;
}): JSX.Element {
	const { time, timeUnitName } = convertTimeToRelevantUnit(
		span.durationNano / 1e6,
	);

	const spread = traceMetadata.endTime - traceMetadata.startTime;
	const leftOffset = ((span.timestamp - traceMetadata.startTime) * 1e2) / spread;
	const width = (span.durationNano * 1e2) / (spread * 1e6);

	return (
		<div
			className={cx(
				'span-duration',
				interestedSpanId === span.spanId ? 'interested-span' : '',
			)}
		>
			<div
				className="span-line"
				style={{ left: `${leftOffset}%`, width: `${width}%` }}
			/>
			<Typography.Text
				className="span-line-text"
				style={{ left: `${leftOffset}%` }}
			>{`${toFixed(time, 2)} ${timeUnitName}`}</Typography.Text>
		</div>
	);
}

// table config
const columnDefHelper = createColumnHelper<Span>();

function getWaterfallColumns({
	handleCollapseUncollapse,
	uncollapsedNodes,
	interestedSpanId,
	traceMetadata,
}: {
	handleCollapseUncollapse: (id: string, collapse: boolean) => void;
	uncollapsedNodes: string[];
	interestedSpanId: IInterestedSpan;
	traceMetadata: ITraceMetadata;
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
					interestedSpanId={interestedSpanId.spanId}
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
					interestedSpanId={interestedSpanId.spanId}
					traceMetadata={traceMetadata}
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
		if (spans.length < 500) return;

		if (range?.startIndex === 0 && instance.isScrolling) {
			if (spans[0].parentSpanId !== '') {
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
				interestedSpanId,
				traceMetadata,
			}),
		[handleCollapseUncollapse, uncollapsedNodes, interestedSpanId, traceMetadata],
	);

	useEffect(() => {
		if (interestedSpanId.spanId !== '' && virtualizerRef.current) {
			const idx = spans.findIndex(
				(span) => span.spanId === interestedSpanId.spanId,
			);
			if (idx !== -1)
				virtualizerRef.current.scrollToIndex(idx, {
					align: 'center',
					behavior: 'auto',
				});
		}
	}, [interestedSpanId, spans]);

	return (
		<div className="success-content">
			<TableV3
				columns={columns}
				data={spans}
				config={{
					handleVirtualizerInstanceChanged,
				}}
				customClassName="waterfall-table"
				virtualiserRef={virtualizerRef}
			/>
		</div>
	);
}

export default Success;
