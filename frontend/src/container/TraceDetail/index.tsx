import { Affix, Col, Divider, Row, Typography } from 'antd';
import GanttChart from 'container/GantChart';
import { getNodeById } from 'container/GantChart/utils';
import Timeline from 'container/Timeline';
import TraceFlameGraph from 'container/TraceFlameGraph';
import dayjs from 'dayjs';
import { spanServiceNameToColorMapping } from 'lib/getRandomColor';
import { filterSpansByString } from './utils';
import React, { useMemo, useState } from 'react';
import { ITraceTree, PayloadProps } from 'types/api/trace/getTraceItem';
import { getSpanTreeMetadata } from 'utils/getSpanTreeMetadata';
import { spanToTreeUtil } from 'utils/spanToTree';
import SelectedSpanDetails from './SelectedSpanDetails';

const TraceDetail = ({ response }: TraceDetailProps): JSX.Element => {
	const spanServiceColors = useMemo(
		() => spanServiceNameToColorMapping(response[0].events),
		[response],
	);

	const [treeData, setTreeData] = useState<ITraceTree>(
		spanToTreeUtil(filterSpansByString('', response[0].events)),
	);

	const [activeHoverId, setActiveHoverId] = useState<string>('');
	const [activeSelectedId, setActiveSelectedId] = useState<string>('');

	const { treeData: tree, ...traceMetaData } = useMemo(() => {
		return getSpanTreeMetadata(treeData, spanServiceColors);
	}, [treeData]);

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

interface TraceDetailProps {
	response: PayloadProps;
}

export default TraceDetail;
