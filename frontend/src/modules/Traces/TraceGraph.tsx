import './TraceGraph.css';
import dayjs from 'dayjs';
import { Affix, Card, Col, Row, Space, Typography, Divider } from 'antd';
import * as d3 from 'd3';
import { flamegraph } from 'd3-flame-graph';
import * as d3Tip from 'd3-tip';
import { isEmpty, sortBy } from 'lodash-es';
import React, { useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import { useLocation, useParams } from 'react-router-dom';
import {
	fetchTraceItem,
	pushDStree,
	spansWSameTraceIDResponse,
} from 'store/actions';
import { AppState } from 'store/reducers';
import styled from 'styled-components';
import { spanToTreeUtil } from 'utils/spanToTree';
import { getSpanTreeMetadata } from 'utils/getSpanTreeMetadata';
import { spanServiceNameToColorMapping } from 'lib/getRandomColor';
import SelectedSpanDetails from './SelectedSpanDetails';
import TraceGanttChart from './TraceGanttChart';
import TraceFlameGraph from 'container/TraceFlameGraph';
interface TraceGraphProps {
	traceItem: spansWSameTraceIDResponse;
	fetchTraceItem: Function;
}

const TraceGanttChartContainer = styled(Card)`
	background: #333333;
	border-radius: 5px;
`;

const _TraceGraph = (props: TraceGraphProps) => {
	const location = useLocation();
	const spanId = location?.state?.spanId;
	const { id } = useParams<{ id?: string }>();

	const [clickedSpanTags, setClickedSpanTags] = useState<pushDStree>([]);
	const [selectedSpan, setSelectedSpan] = useState({});
	const [clickedSpan, setClickedSpan] = useState(null);
	const [resetZoom, setResetZoom] = useState(false);
	const [sortedTreeData, setSortedTreeData] = useState<pushDStree[]>([]);

	let sortedData = {};

	const getSortedData = (treeData: pushDStree[], parent = {}) => {
		if (!isEmpty(treeData)) {
			if (treeData[0].id !== 'empty') {
				return Array.from(treeData).map((item, key) => {
					if (!isEmpty(item.children)) {
						getSortedData(item.children, item);
						sortedData = sortBy(item.children, (i) => i.startTime);
						treeData[key].children = sortedData;
					}
					if (!isEmpty(parent)) {
						treeData[key].parent = parent;
					}
					return treeData;
				});
			}
			return treeData;
		}
	};

	const spanServiceColors = spanServiceNameToColorMapping(
		props.traceItem[0].events,
	);

	const { treeData: tree, ...traceMetaData } = getSpanTreeMetadata(
		spanToTreeUtil(props.traceItem[0].events),
		spanServiceColors,
	);

	const dispatch = useDispatch();

	useEffect(() => {
		//sets span width based on value - which is mapped to duration
		fetchTraceItem(id || '')(dispatch);
	}, [dispatch, id]);

	// useEffect(() => {
	// 	if (props.traceItem) {
	// 		const sortedData = getSortedData([tree]);
	// 		setSortedTreeData(sortedData?.[0]);
	// 		getSpanInfo(sortedData?.[0], spanId);
	// 		// This is causing element to change ref. Can use both useRef or this approach.
	// 		d3
	// 			.select('#chart')
	// 			.datum(tree)
	// 			.call(chart)
	// 			.sort((item) => item.startTime);
	// 	}
	// }, [props.traceItem]);
	// if this monitoring of props.traceItem.data is removed then zoom on click doesn't work
	// Doesn't work if only do initial check, works if monitor an element - as it may get updated in sometime

	useEffect(() => {
		if (
			!isEmpty(sortedTreeData) &&
			sortedTreeData?.id !== 'empty' &&
			isEmpty(clickedSpanTags)
		) {
			setClickedSpanTags(sortedTreeData?.[0]);
		}
	}, [sortedTreeData]);

	useEffect(() => {
		if (resetZoom) {
			// This is causing element to change ref. Can use both useRef or this approach.
			d3
				.select('#chart')
				.datum(tree)
				.call(chart)
				.sort((item) => item.startTime);
			setResetZoom(false);
		}
	}, [resetZoom]);

	const tip = d3Tip
		.default()
		.attr('class', 'd3-tip')
		.html(function (d: any) {
			return d.data.name + '<br>duration: ' + d.data.value / 1000000 + 'ms';
		});

	const onClick = (z: any) => {
		setClickedSpanTags(z.data);
		setClickedSpan(z.data);
		setSelectedSpan([]);
		console.log(`Clicked on ${z.data.name}, id: "${z.id}"`);
	};

	const setSpanTagsInfo = (z: any) => {
		setClickedSpanTags(z.data);
	};

	const getSpanInfo = (data: [pushDStree], spanId: string): void => {
		if (resetZoom) {
			setSelectedSpan({});
			return;
		}
		if (data?.[0]?.id !== 'empty') {
			Array.from(data).map((item) => {
				if (item.id === spanId) {
					setSelectedSpan(item);
					setClickedSpanTags(item);
					return item;
				} else if (!isEmpty(item.children)) {
					getSpanInfo(item.children, spanId);
				}
			});
		}
	};

	const chart = flamegraph()
		.cellHeight(18)
		.transitionDuration(500)
		.inverted(true)
		.tooltip(tip)
		.minFrameSize(4)
		.elided(false)
		.differential(false)
		.sort((item) => item.startTime)
		//Use self value=true when we're using not using aggregated option, Which is not our case.
		// In that case it's doing step function sort of stuff thru computation.
		// Source flamegraph.js line 557 and 573.
		// .selfValue(true)
		.onClick(onClick)
		.width(800);

	const handleResetZoom = (value) => {
		setResetZoom(value);
	};

	return (
		<Row style={{ flex: 1 }}>
			<Col flex={'auto'} style={{ display: 'flex', flexDirection: 'column' }}>
				<Row>
					<Col flex="175px">
						<div
							style={{
								textAlign: 'center',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								justifyContent: 'center',
								height: '100%',
							}}
						>
							<Typography.Title level={5} style={{ margin: 0 }}>
								Trace Details
							</Typography.Title>
							<Typography.Text style={{ margin: 0 }}>
								{traceMetaData.totalSpans} Span
							</Typography.Text>
						</div>
					</Col>
					<Col flex={'auto'}>
						<div
							style={{
								display: 'flex',
								justifyContent: 'center',
								flexDirection: 'column',
								alignItems: 'center',
								marginRight: '1rem',
							}}
						>
							<TraceFlameGraph treeData={tree} traceMetaData={traceMetaData} />
							<div id="chart" style={{ fontSize: 12, marginTop: 20 }}></div>
						</div>
					</Col>
				</Row>
				<Row>
					<Col
						flex="175px"
						style={{
							textAlign: 'end',
							paddingRight: '1rem',
						}}
					>
						{dayjs(traceMetaData.globalStart / 1e6).format('hh:mm:ssa MM/DD')}
					</Col>
					<Col flex="auto" style={{ marginRight: '1rem' }}>
						Timeline
					</Col>
				</Row>
				<Divider></Divider>
				<div
					style={{
						width: '100%',
						flex: '0 1 auto',
						height: '100%',
						overflowY: 'hidden',
						position: 'relative',
						display: 'flex',
					}}
				>
					<div
						style={{
							overflowY: 'scroll',
							height: '100%',
							width: '100%',
							position: 'absolute',
							flex: 1,
						}}
					>
						<div
							style={{
								minHeight: '200vh', // Remove this
							}}
						>
							Scrollable Gantt Chart
						</div>
					</div>
				</div>
				{/* <Affix offsetTop={24}>
						<TraceGanttChartContainer id={'collapsable'}>
							<TraceGanttChart
								treeData={sortedTreeData}
								clickedSpan={clickedSpan}
								selectedSpan={selectedSpan}
								resetZoom={handleResetZoom}
								setSpanTagsInfo={setSpanTagsInfo}
							/>
						</TraceGanttChartContainer>
					</Affix> */}
			</Col>
			<Col>
				<Divider style={{ height: '100%', margin: '0' }} type="vertical" />
			</Col>
			<Col md={5} sm={5}>
				<Affix offsetTop={24}>
					<SelectedSpanDetails data={clickedSpanTags} />
				</Affix>
			</Col>
		</Row>
	);
};

const mapStateToProps = (
	state: AppState,
): { traceItem: spansWSameTraceIDResponse } => {
	return { traceItem: state.traceItem };
};

export const TraceGraph = connect(mapStateToProps, {
	fetchTraceItem: fetchTraceItem,
})(_TraceGraph);
