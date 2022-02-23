import React, { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Affix, Col, Row, Typography, Divider } from 'antd';
import { connect, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
	fetchTraceItem,
	pushDStree,
	spansWSameTraceIDResponse,
} from 'store/actions';
import { AppState } from 'store/reducers';
import { spanToTreeUtil } from 'utils/spanToTree';
import { getSpanTreeMetadata } from 'utils/getSpanTreeMetadata';
import { spanServiceNameToColorMapping } from 'lib/getRandomColor';
import SelectedSpanDetails from './SelectedSpanDetails';
import GanttChart from 'container/GantChart';

import TraceFlameGraph from 'container/TraceFlameGraph';
import Timeline from 'container/Timeline';
import { getNodeById } from 'container/GantChart/utils';
import { filterSpansByString } from './utils';
interface TraceGraphProps {
	traceItem: spansWSameTraceIDResponse;
	fetchTraceItem: Function;
}

const _TraceGraph = (props: TraceGraphProps) => {
	const { id } = useParams<{ id: string }>();

	const spanServiceColors = spanServiceNameToColorMapping(
		props.traceItem[0].events,
	);

	const [treeData, setTreeData] = useState<pushDStree>(
		spanToTreeUtil(filterSpansByString('', props.traceItem[0].events)),
	);

	const dispatch = useDispatch();

	useEffect(() => {
		fetchTraceItem(id || '')(dispatch);
	}, [dispatch, id]);

	useEffect(() => {
		if (props.traceItem[0].events.length) {
			setTreeData(
				spanToTreeUtil(filterSpansByString('route', props.traceItem[0].events)),
			);
		}
	}, [props.traceItem[0]]);

	const [activeHoverId, setActiveHoverId] = useState<string>('');
	const [activeSelectedId, setActiveSelectedId] = useState<string>('');

	const { treeData: tree, ...traceMetaData } = getSpanTreeMetadata(
		treeData,
		spanServiceColors,
	);

	const onResetHandler = () => {
		setTreeData(tree);
	};

	const getSelectedNode = useMemo(() => {
		return getNodeById(activeSelectedId, treeData);
	}, [activeSelectedId, treeData]);

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
					<SelectedSpanDetails data={getSelectedNode} />
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
