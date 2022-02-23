import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Affix, Card, Col, Row, Space, Typography, Divider } from 'antd';
import { isEmpty, sortBy } from 'lodash-es';
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
import GanttChart from 'container/GantChart';
import { isEqual } from 'lodash-es';

import TraceFlameGraph from 'container/TraceFlameGraph';
import Timeline from 'container/Timeline';
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

	const [treeData, setTreeData] = useState<pushDStree>(tree);
	const [activeHoverId, setActiveHoverId] = useState<string>('');
	const [activeSelectedId, setActiveSelectedId] = useState<string>('');

	const onResetHandler = () => {
		setTreeData(tree);
	};

	return (
		<Row style={{ flex: 1 }}>
			<Col flex={'auto'} style={{ display: 'flex', flexDirection: 'column' }}>
				<Row>
					<Col flex="175px">
						<Typography.Title level={5} style={{ margin: 0 }}>
							Trace Details
						</Typography.Title>
						<Typography.Text style={{ margin: 0 }}>
							{traceMetaData.totalSpans} Span
						</Typography.Text>
					</Col>
					<Col flex={'auto'}>
						<TraceFlameGraph treeData={treeData} traceMetaData={traceMetaData} />
					</Col>
				</Row>
				<Row>
					<Col>
						{dayjs(traceMetaData.globalStart / 1e6).format('hh:mm:ssa MM/DD')}
					</Col>
					<Col flex="auto" style={{ marginRight: '1rem', overflow: 'visible' }}>
						<Timeline traceMetaData={traceMetaData} />
					</Col>
					<Divider style={{ height: '100%', margin: '0' }} />
				</Row>
				<GanttChart
					onResetHandler={onResetHandler}
					traceMetaData={traceMetaData}
					data={treeData}
					setTreeData={setTreeData}
					activeSelectedId={activeSelectedId}
					activeHoverId={activeHoverId}
					setActiveHoverId={setActiveHoverId}
					setActiveSelectedId={setActiveSelectedId}
				/>
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
