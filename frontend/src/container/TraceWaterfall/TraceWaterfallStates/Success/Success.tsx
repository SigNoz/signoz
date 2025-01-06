import './Success.styles.scss';

import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { Button, Typography } from 'antd';
import cx from 'classnames';
import { TableV3 } from 'components/TableV3/TableV3';
import { TraceWaterfallStates } from 'container/TraceWaterfall/constants';
import { ChevronDown, ChevronRight, Leaf } from 'lucide-react';
import { Dispatch, SetStateAction, useCallback, useMemo } from 'react';
import { Span } from 'types/api/trace/getTraceV2';

// css config
const COLUMN_MIN_SIZE = 50;
const CONNECTOR_WIDTH = 28;
const VERTICAL_CONNECTOR_WIDTH = 1;
interface ISuccessProps {
	spans: Span[];
	traceWaterfallState: TraceWaterfallStates;
	interestedSpanId: string;
	uncollapsedNodes: string[];
	setInterestedSpanId: Dispatch<SetStateAction<string | null>>;
	setUncollapsedNodes: Dispatch<SetStateAction<string[]>>;
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
	return (
		<div
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
}: {
	span: Span;
	interestedSpanId: string;
}): JSX.Element {
	return (
		<Typography.Text
			className={cx(interestedSpanId === span.spanId ? 'interested-span' : '')}
		>
			{span.durationNano}
		</Typography.Text>
	);
}

// table config
const columnDefHelper = createColumnHelper<Span>();

function getWaterfallColumns({
	handleCollapseUncollapse,
	uncollapsedNodes,
	interestedSpanId,
}: {
	handleCollapseUncollapse: (id: string, collapse: boolean) => void;
	uncollapsedNodes: string[];
	interestedSpanId: string;
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
					interestedSpanId={interestedSpanId}
				/>
			),
			size: 400,
		}),
		columnDefHelper.display({
			id: 'span-duration',
			header: () => <span>heiji</span>,
			cell: (props): JSX.Element => (
				<SpanDuration
					span={props.row.original}
					interestedSpanId={interestedSpanId}
				/>
			),
		}),
	];

	return waterfallColumns;
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

	console.log(traceWaterfallState);

	const handleCollapseUncollapse = useCallback(
		(spanId: string, collapse: boolean) => {
			console.log('here');
			if (collapse) {
				setUncollapsedNodes((prev) => prev.filter((id) => id === spanId));
				setInterestedSpanId(spanId);
			} else {
				setUncollapsedNodes((prev) => [...prev, spanId]);
				setInterestedSpanId(spanId);
			}
		},
		[setInterestedSpanId, setUncollapsedNodes],
	);

	const columns = useMemo(
		() =>
			getWaterfallColumns({
				handleCollapseUncollapse,
				uncollapsedNodes,
				interestedSpanId,
			}),
		[handleCollapseUncollapse, uncollapsedNodes, interestedSpanId],
	);

	return (
		<div className="success-content">
			<TableV3
				columns={columns}
				data={spans}
				config={{
					defaultColumnMinSize: COLUMN_MIN_SIZE,
				}}
				customClassName="waterfall-table"
			/>
		</div>
	);
}

export default Success;
