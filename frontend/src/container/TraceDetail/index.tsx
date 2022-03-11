import { FilterOutlined } from '@ant-design/icons';
import { Button, Col, Divider, Row, Space, Typography } from 'antd';
import GanttChart from 'container/GantChart';
import { getNodeById } from 'container/GantChart/utils';
import Timeline from 'container/Timeline';
import TraceFlameGraph from 'container/TraceFlameGraph';
import dayjs from 'dayjs';
import useUrlQuery from 'hooks/useUrlQuery';
import { spanServiceNameToColorMapping } from 'lib/getRandomColor';
import history from 'lib/history';
import { SPAN_DETAILS_LEFT_COL_WIDTH } from 'pages/TraceDetail/constants';
import React, { useEffect, useMemo, useState } from 'react';
import { ITraceTree, PayloadProps } from 'types/api/trace/getTraceItem';
import { getSpanTreeMetadata } from 'utils/getSpanTreeMetadata';
import { spanToTreeUtil } from 'utils/spanToTree';

import SelectedSpanDetails from './SelectedSpanDetails';
import styles from './TraceGraph.module.css';
import { getSortedData } from './utils';
import { INTERVAL_UNITS } from './utils';

const TraceDetail = ({ response }: TraceDetailProps): JSX.Element => {
	const spanServiceColors = useMemo(
		() => spanServiceNameToColorMapping(response[0].events),
		[response],
	);

	const urlQuery = useUrlQuery();
	const [spanId, _setSpanId] = useState<string | null>(urlQuery.get('spanId'));

	const [intervalUnit, setIntervalUnit] = useState(INTERVAL_UNITS[0]);
	const [searchSpanString, setSearchSpanString] = useState('');
	const [activeHoverId, setActiveHoverId] = useState<string>('');
	const [activeSelectedId, setActiveSelectedId] = useState<string>(spanId || '');

	const [treeData, setTreeData] = useState<ITraceTree>(
		spanToTreeUtil(response[0].events),
	);

	const { treeData: tree, ...traceMetaData } = useMemo(() => {
		return getSpanTreeMetadata(getSortedData(treeData), spanServiceColors);
	}, [treeData]);

	const [globalTraceMetadata, _setGlobalTraceMetadata] = useState<object>({
		...traceMetaData,
	});

	useEffect(() => {
		if (activeSelectedId) {
			history.replace({
				pathname: history.location.pathname,
				search: `?spanId=${activeSelectedId}`,
			});
		}
	}, [activeSelectedId]);

	const getSelectedNode = useMemo(() => {
		return getNodeById(activeSelectedId, treeData);
	}, [activeSelectedId, treeData]);

	const onSearchHandler = (value: string) => {
		setSearchSpanString(value);
		setTreeData(spanToTreeUtil(response[0].events));
	};
	const onFocusSelectedSpanHandler = () => {
		const treeNode = getNodeById(activeSelectedId, tree);
		if (treeNode) {
			setTreeData(treeNode);
		}
	};

	const onResetHandler = () => {
		setTreeData(spanToTreeUtil(response[0].events));
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
							intervalUnit={intervalUnit}
						/>
					</Col>
				</Row>
				<Row style={{ marginTop: '2rem' }}>
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
						<Timeline
							globalTraceMetadata={globalTraceMetadata}
							traceMetaData={traceMetaData}
							intervalUnit={intervalUnit}
							setIntervalUnit={setIntervalUnit}
						/>
					</Col>
					<Divider style={{ height: '100%', margin: '0' }} />
				</Row>
				<Row
					className={styles['trace-detail-content-spacing']}
					style={{ margin: '1.5rem 1rem 0.5rem' }}
				>
					<Col flex={`${SPAN_DETAILS_LEFT_COL_WIDTH}px`}>
						{/* <Search
							placeholder="Type to filter.."
							allowClear
							onSearch={onSearchHandler}
							style={{ width: 200 }}
						/> */}
					</Col>
					<Col flex={'auto'}>
						<Space
							style={{
								float: 'right',
							}}
						>
							<Button onClick={onFocusSelectedSpanHandler} icon={<FilterOutlined />}>
								Focus on selected span
							</Button>
							<Button type="default" onClick={onResetHandler}>
								Reset Focus
							</Button>
						</Space>
					</Col>
				</Row>
				<div
					className={styles['trace-detail-content-spacing']}
					style={{
						display: 'flex',
						flexDirection: 'column',
						position: 'relative',
						flex: 1,
						overflowY: 'auto',
						overflowX: 'hidden',
					}}
				>
					<GanttChart
						traceMetaData={traceMetaData}
						data={tree}
						activeSelectedId={activeSelectedId}
						activeHoverId={activeHoverId}
						setActiveHoverId={setActiveHoverId}
						setActiveSelectedId={setActiveSelectedId}
						spanId={spanId || ''}
						intervalUnit={intervalUnit}
					/>
				</div>
			</Col>
			<Col>
				<Divider style={{ height: '100%', margin: '0' }} type="vertical" />
			</Col>
			<Col
				md={5}
				sm={5}
				style={{
					height: '100%',
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
				}}
			>
				<SelectedSpanDetails tree={getSelectedNode} />
			</Col>
		</Row>
	);
};

interface TraceDetailProps {
	response: PayloadProps;
}

export default TraceDetail;
