import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { flamegraph } from 'd3-flame-graph';
import { connect } from 'react-redux';
import { Card, Row, Col, Space, Affix } from 'antd';
import * as d3 from 'd3';
import * as d3Tip from 'd3-tip';
import './TraceGraph.css';
import { spanToTreeUtil } from 'Src/utils/spanToTree';
import {
	fetchTraceItem,
	pushDStree,
	spansWSameTraceIDResponse,
} from '../../store/actions';
import { StoreState } from 'Src/store/reducers';
import SelectedSpanDetails from './SelectedSpanDetails';
import TraceGanttChart from './TraceGanttChart';
import styled from 'styled-components';
import { isEmpty, sortBy } from 'lodash-es';

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
	const params = useParams<{ id?: string }>();
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

	const tree = spanToTreeUtil(props.traceItem[0].events);

	useEffect(() => {
		//sets span width based on value - which is mapped to duration
		props.fetchTraceItem(params.id);
	}, []);

	useEffect(() => {
		if (props.traceItem) {
			const sortedData = getSortedData([tree]);
			setSortedTreeData(sortedData?.[0]);
			getSpanInfo(sortedData?.[0], spanId);
			// This is causing element to change ref. Can use both useRef or this approach.
			d3.select('#chart').datum(tree).call(chart).sort(item=>item.startTime);
		}
	}, [props.traceItem]);
	// if this monitoring of props.traceItem.data is removed then zoom on click doesn't work
	// Doesn't work if only do initial check, works if monitor an element - as it may get updated in sometime

	useEffect(() => {
		if(!isEmpty(sortedTreeData) && sortedTreeData?.id !== 'empty' && isEmpty(clickedSpanTags)) {
			setClickedSpanTags(sortedTreeData?.[0]);
		}
	}, [sortedTreeData]);

	useEffect(() => {
		if (resetZoom) {
			// This is causing element to change ref. Can use both useRef or this approach.
			d3.select('#chart').datum(tree).call(chart).sort(item=>item.startTime);
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
		<Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
			<Col md={18} sm={18}>
				<Space direction="vertical" size="middle" style={{ width: '100%' }}>
					<Card bodyStyle={{ padding: 24 }} style={{ height: 320 }}>
						<div
							style={{
								display: 'flex',
								justifyContent: 'center',
								flexDirection: 'column',
								alignItems: 'center',
							}}
						>
							<div style={{ textAlign: 'center' }}>
								Trace Graph component ID is {params.id}{' '}
							</div>
							<div id="chart" style={{ fontSize: 12, marginTop: 20 }}></div>
						</div>
					</Card>
					<Affix offsetTop={24}>
						<TraceGanttChartContainer id={'collapsable'}>
							<TraceGanttChart
								treeData={sortedTreeData}
								clickedSpan={clickedSpan}
								selectedSpan={selectedSpan}
								resetZoom={handleResetZoom}
								setSpanTagsInfo={setSpanTagsInfo}
							/>
						</TraceGanttChartContainer>
					</Affix>
				</Space>
			</Col>
			<Col md={6} sm={6}>
				<Affix offsetTop={24}>
					<SelectedSpanDetails data={clickedSpanTags} />
				</Affix>
			</Col>
		</Row>
	);
};

const mapStateToProps = (
	state: StoreState,
): { traceItem: spansWSameTraceIDResponse } => {
	return { traceItem: state.traceItem };
};

export const TraceGraph = connect(mapStateToProps, {
	fetchTraceItem: fetchTraceItem,
})(_TraceGraph);
