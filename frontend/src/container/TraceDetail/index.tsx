import {
	Affix,
	Col,
	Divider,
	Row,
	Typography,
	Input,
	Space,
	Button,
} from 'antd';
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
import styles from './TraceGraph.module.css';
const SPAN_DETAILS_LEFT_COL_WIDTH = 225;

const { Search } = Input;

const TraceDetail = ({ response }: TraceDetailProps): JSX.Element => {
	const spanServiceColors = useMemo(
		() => spanServiceNameToColorMapping(response[0].events),
		[response],
	);

	const [searchSpanString, setSearchSpanString] = useState('');

	const [activeHoverId, setActiveHoverId] = useState<string>('');
	const [activeSelectedId, setActiveSelectedId] = useState<string>('');

	const [treeData, setTreeData] = useState<ITraceTree>(
		spanToTreeUtil(filterSpansByString(searchSpanString, response[0].events)),
	);

	const { treeData: tree, ...traceMetaData } = useMemo(() => {
		return getSpanTreeMetadata(treeData, spanServiceColors);
	}, [treeData]);


	const [originalTree, setOriginalTree] = useState<ITraceTree>({ ...treeData })
	const [originalTrace, setOriginalTrace] = useState<object>({ ...tree, ...traceMetaData })

	const getSelectedNode = useMemo(() => {
		return getNodeById(activeSelectedId, treeData);
	}, [activeSelectedId, treeData]);

	const onSearchHandler = (value: string) => {
		setSearchSpanString(value);
		setTreeData(spanToTreeUtil(filterSpansByString(value, response[0].events)));
	};
	const onFocusSelectedSpanHandler = () => {
		const treeNode = getNodeById(activeSelectedId, tree);
		if (treeNode) {
			setTreeData(treeNode);
		}
	};

	const onResetHandler = () => {
		setTreeData(originalTree);
	};

	return (
		<Row style={{ flex: 1 }}>
			<Col flex={'auto'} style={{ display: 'flex', flexDirection: 'column' }}>
				<Row className={styles['trace-detail-content-spacing']}>
					<Col
						flex={`${SPAN_DETAILS_LEFT_COL_WIDTH}px`}
						style={{ alignItems: 'center', display: 'flex', flexDirection: 'column' }}
					>
						<Typography.Title level={5} style={{ margin: 0 }}>
							Trace Details
						</Typography.Title>
						<Typography.Text style={{ margin: 0 }}>
							{traceMetaData.totalSpans} Span
						</Typography.Text>
					</Col>
					<Col flex={'auto'}>
						<TraceFlameGraph
							treeData={tree}
							traceMetaData={traceMetaData}
							hoveredSpanId={activeHoverId}
							selectedSpanId={activeSelectedId}
							onSpanHover={setActiveHoverId}
							onSpanSelect={setActiveSelectedId}
						/>
					</Col>
				</Row>
				<Row>
					<Col
						flex={`${SPAN_DETAILS_LEFT_COL_WIDTH}px`}
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						{dayjs(traceMetaData.globalStart / 1e6).format('hh:mm:ssa MM/DD')}
					</Col>
					<Col
						flex="auto"
						style={{ overflow: 'visible' }}
						className={styles['trace-detail-content-spacing']}
					>
						<Timeline traceMetaData={traceMetaData} />
					</Col>
					<Divider style={{ height: '100%', margin: '0' }} />
				</Row>
				<Row
					className={styles['trace-detail-content-spacing']}
					style={{ margin: '1rem' }}
				>
					<Col
						flex={`${SPAN_DETAILS_LEFT_COL_WIDTH}px`}
						style={{
							justifyContent: 'center',
							alignItems: 'center',
							display: 'flex',
							padding: '0 0.5rem',
						}}
					>
						<Search
							placeholder="Type to filter.."
							allowClear
							onSearch={onSearchHandler}
						/>
					</Col>
					<Col flex={'auto'}>
						<Space
							style={{
								float: 'right',
							}}
						>
							<Button type="default" onClick={onFocusSelectedSpanHandler} >Focus on selected span</Button>
							<Button type="default" onClick={onResetHandler}>Reset Focus</Button>
						</Space>
					</Col>
				</Row>
				<div className={styles['trace-detail-content-spacing']}>
					<GanttChart
						onResetHandler={onResetHandler}
						traceMetaData={traceMetaData}
						data={tree}
						setTreeData={setTreeData}
						activeSelectedId={activeSelectedId}
						activeHoverId={activeHoverId}
						setActiveHoverId={setActiveHoverId}
						setActiveSelectedId={setActiveSelectedId}
					/>
				</div>
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
