/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './Success.styles.scss';

import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { Virtualizer } from '@tanstack/react-virtual';
import { Button, TabsProps, Tooltip, Typography } from 'antd';
import cx from 'classnames';
import DetailsDrawer from 'components/DetailsDrawer/DetailsDrawer';
import { TableV3 } from 'components/TableV3/TableV3';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { themeColors } from 'constants/theme';
import { getTraceToLogsQuery } from 'container/TraceDetail/SelectedSpanDetails/config';
import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import { IInterestedSpan } from 'container/TraceWaterfall/TraceWaterfall';
import { useIsDarkMode } from 'hooks/useDarkMode';
import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import {
	AlertCircle,
	Anvil,
	ArrowUpRight,
	Bookmark,
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
	useState,
} from 'react';
import { Span } from 'types/api/trace/getTraceV2';
import { toFixed } from 'utils/toFixed';

import AttributesTable from './DrawerComponents/AttributesTable/AttributesTable';
import DrawerDescriptiveContent from './DrawerComponents/DrawerDescriptiveContent/DrawerDescriptiveContent';
import EventsTable from './DrawerComponents/EventsTable/EventsTable';

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
}

function SpanOverview({
	span,
	isSpanCollapsed,
	interestedSpanId,
	handleCollapseUncollapse,
	setTraceDetailsOpen,
	setSpanDetails,
}: {
	span: Span;
	isSpanCollapsed: boolean;
	interestedSpanId: string;
	handleCollapseUncollapse: (id: string, collapse: boolean) => void;
	setTraceDetailsOpen: Dispatch<SetStateAction<boolean>>;
	setSpanDetails: Dispatch<SetStateAction<Span | undefined>>;
}): JSX.Element {
	const isRootSpan = span.parentSpanId === '';
	const spanRef = useRef<HTMLDivElement>(null);
	const isDarkMode = useIsDarkMode();

	let color = generateColor(
		span.serviceName,
		isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
	);

	if (span.hasError) {
		color = `var(--bg-cherry-500)`;
	}

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
			onClick={(): void => {
				setSpanDetails(span);
				setTraceDetailsOpen(true);
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
	interestedSpanId,
	traceMetadata,
	setTraceDetailsOpen,
	setSpanDetails,
}: {
	span: Span;
	interestedSpanId: string;
	traceMetadata: ITraceMetadata;
	setTraceDetailsOpen: Dispatch<SetStateAction<boolean>>;
	setSpanDetails: Dispatch<SetStateAction<Span | undefined>>;
}): JSX.Element {
	const { time, timeUnitName } = convertTimeToRelevantUnit(
		span.durationNano / 1e6,
	);

	const spread = traceMetadata.endTime - traceMetadata.startTime;
	const leftOffset = ((span.timestamp - traceMetadata.startTime) * 1e2) / spread;
	const width = (span.durationNano * 1e2) / (spread * 1e6);
	const isDarkMode = useIsDarkMode();

	let color = generateColor(
		span.serviceName,
		isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
	);

	if (span.hasError) {
		color = `var(--bg-cherry-500)`;
	}

	return (
		<div
			className={cx(
				'span-duration',
				interestedSpanId === span.spanId ? 'interested-span' : '',
			)}
			onClick={(): void => {
				setSpanDetails(span);
				setTraceDetailsOpen(true);
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
	interestedSpanId,
	traceMetadata,
	setTraceDetailsOpen,
	setSpanDetails,
}: {
	handleCollapseUncollapse: (id: string, collapse: boolean) => void;
	uncollapsedNodes: string[];
	interestedSpanId: IInterestedSpan;
	traceMetadata: ITraceMetadata;
	setTraceDetailsOpen: Dispatch<SetStateAction<boolean>>;
	setSpanDetails: Dispatch<SetStateAction<Span | undefined>>;
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
					setTraceDetailsOpen={setTraceDetailsOpen}
					setSpanDetails={setSpanDetails}
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
					setTraceDetailsOpen={setTraceDetailsOpen}
					setSpanDetails={setSpanDetails}
				/>
			),
		}),
	];

	return waterfallColumns;
}

function getItems(span: Span, startTime: number): TabsProps['items'] {
	return [
		{
			label: (
				<Button
					type="text"
					icon={<Bookmark size="14" />}
					className="flamegraph-waterfall-toggle"
				>
					Attributes
				</Button>
			),
			key: 'attributes',
			children: <AttributesTable span={span} />,
		},
		{
			label: (
				<Button
					type="text"
					icon={<Anvil size="14" />}
					className="flamegraph-waterfall-toggle"
				>
					Events
				</Button>
			),
			key: 'events',
			children: <EventsTable span={span} startTime={startTime} />,
		},
	];
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
	const [traceDetailsOpen, setTraceDetailsOpen] = useState<boolean>(false);
	const [spanDetails, setSpanDetails] = useState<Span>();

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
				setTraceDetailsOpen,
				setSpanDetails,
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

	const handleGoToRelatedLogs = useCallback(() => {
		const query = getTraceToLogsQuery(
			traceMetadata.traceId,
			traceMetadata.startTime,
			traceMetadata.endTime,
		);

		history.push(
			`${ROUTES.LOGS_EXPLORER}?${createQueryParams({
				[QueryParams.compositeQuery]: JSON.stringify(query),
				// we subtract 1000 milliseconds from the start time to handle the cases when the trace duration is in nanoseconds
				[QueryParams.startTime]: traceMetadata.startTime - 1000,
				// we add 1000 milliseconds to the end time for nano second duration traces
				[QueryParams.endTime]: traceMetadata.endTime + 1000,
			})}`,
		);
	}, [traceMetadata.endTime, traceMetadata.startTime, traceMetadata.traceId]);

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
					>
						Learn More
					</Button>
				</div>
			)}
			<TableV3
				columns={columns}
				data={spans}
				config={{
					handleVirtualizerInstanceChanged,
				}}
				customClassName="waterfall-table"
				virtualiserRef={virtualizerRef}
			/>
			{spanDetails && (
				<DetailsDrawer
					open={traceDetailsOpen}
					setOpen={setTraceDetailsOpen}
					title="Span Details"
					detailsDrawerClassName="span-dets"
					defaultActiveKey="attributes"
					items={getItems(spanDetails, traceMetadata.startTime)}
					descriptiveContent={<DrawerDescriptiveContent span={spanDetails} />}
					tabBarExtraContent={
						<Button className="related-logs" onClick={handleGoToRelatedLogs}>
							Go to Related Logs
						</Button>
					}
				/>
			)}
		</div>
	);
}

export default Success;
