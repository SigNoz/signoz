import './TraceGraph.css';

import { Affix, Card, Col, Row, Space } from 'antd';
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

import SelectedSpanDetails from './SelectedSpanDetails';
import TraceGanttChart from './TraceGanttChart';
import GanttChart from 'container/GantChart';

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

	const tree = spanToTreeUtil(props.traceItem[0].events);
	const dispatch = useDispatch();

	useEffect(() => {
		//sets span width based on value - which is mapped to duration
		fetchTraceItem(id || '')(dispatch);
	}, [dispatch, id]);

	useEffect(() => {
		if (props.traceItem) {
			const sortedData = getSortedData([tree]);
			if (sortedData) {
				setSortedTreeData(sortedData?.[0] || []);
			}
		}
	}, [props.traceItem]);

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

	return (
		<Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
			<Col md={18} sm={18}>
				<Space direction="vertical" size="middle" style={{ width: '100%' }}>
					{/* <Card bodyStyle={{ padding: 24 }} style={{ height: 320 }}>
						<div
							style={{
								display: 'flex',
								justifyContent: 'center',
								flexDirection: 'column',
								alignItems: 'center',
							}}
						>
							<div style={{ textAlign: 'center' }}>
								Trace Graph component ID is {id}{' '}
							</div>
						</div>
					</Card> */}
					<Affix offsetTop={24}>
						<GanttChart data={sortedTreeData} />

						{/* <TraceGanttChartContainer id={'collapsable'}>
							<TraceGanttChart
								treeData={sortedTreeData}
								clickedSpan={clickedSpan}
								selectedSpan={selectedSpan}
								resetZoom={handleResetZoom}
								setSpanTagsInfo={setSpanTagsInfo}
							/>
						</TraceGanttChartContainer> */}
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
	state: AppState,
): { traceItem: spansWSameTraceIDResponse } => {
	return { traceItem: state.traceItem };
};

export const TraceGraph = connect(mapStateToProps, {
	fetchTraceItem: fetchTraceItem,
})(_TraceGraph);
