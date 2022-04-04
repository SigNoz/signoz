import { FilterOutlined } from '@ant-design/icons';
import { Button, Col } from 'antd';
import {
	StyledCol,
	StyledDiv,
	StyledDivider,
	StyledRow,
	StyledSpace,
	StyledTypography,
} from 'components/Styled';
import * as StyledStyles from 'components/Styled/styles';
import GanttChart, { ITraceMetaData } from 'container/GantChart';
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
import * as styles from './styles';
import { getSortedData, IIntervalUnit, INTERVAL_UNITS } from './utils';

function TraceDetail({ response }: TraceDetailProps): JSX.Element {
	const spanServiceColors = useMemo(
		() => spanServiceNameToColorMapping(response[0].events),
		[response],
	);

	const urlQuery = useUrlQuery();
	const [spanId] = useState<string | null>(urlQuery.get('spanId'));

	const [intervalUnit, setIntervalUnit] = useState<IIntervalUnit>(
		INTERVAL_UNITS[0],
	);
	// const [searchSpanString, setSearchSpanString] = useState('');
	const [activeHoverId, setActiveHoverId] = useState<string>('');
	const [activeSelectedId, setActiveSelectedId] = useState<string>(spanId || '');

	const [treeData, setTreeData] = useState<ITraceTree>(
		spanToTreeUtil(response[0].events),
	);

	const { treeData: tree, ...traceMetaData } = useMemo(() => {
		const tree = getSortedData(treeData);
		// Note: Handle undefined
		/*eslint-disable */
		return getSpanTreeMetadata(tree as ITraceTree, spanServiceColors);
		/* eslint-enable */
	}, [treeData, spanServiceColors]);

	const [globalTraceMetadata] = useState<ITraceMetaData>({
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

	// const onSearchHandler = (value: string) => {
	// 	setSearchSpanString(value);
	// 	setTreeData(spanToTreeUtil(response[0].events));
	// };
	const onFocusSelectedSpanHandler = (): void => {
		const treeNode = getNodeById(activeSelectedId, tree);
		if (treeNode) {
			setTreeData(treeNode);
		}
	};

	const onResetHandler = (): void => {
		setTreeData(spanToTreeUtil(response[0].events));
	};

	return (
		<StyledRow styledclass={[StyledStyles.Flex({ flex: 1 })]}>
			<StyledCol flex="auto" styledclass={styles.leftContainer}>
				<StyledRow styledclass={styles.flameAndTimelineContainer}>
					<StyledCol
						styledclass={styles.traceMetaDataContainer}
						flex={`${SPAN_DETAILS_LEFT_COL_WIDTH}px`}
					>
						<StyledTypography.Title styledclass={[styles.removeMargin]} level={5}>
							Trace Details
						</StyledTypography.Title>
						<StyledTypography.Text styledclass={[styles.removeMargin]}>
							{traceMetaData.totalSpans} Span
						</StyledTypography.Text>
					</StyledCol>
					<Col flex="auto">
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
				</StyledRow>
				<StyledRow styledclass={[styles.traceDateAndTimelineContainer]}>
					<StyledCol
						flex={`${SPAN_DETAILS_LEFT_COL_WIDTH}px`}
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						{tree && dayjs(tree.startTime).format('hh:mm:ss a MM/DD')}
					</StyledCol>
					<StyledCol flex="auto" styledclass={[styles.timelineContainer]}>
						<Timeline
							globalTraceMetadata={globalTraceMetadata}
							traceMetaData={traceMetaData}
							setIntervalUnit={setIntervalUnit}
						/>
					</StyledCol>
					<StyledDivider styledclass={[styles.verticalSeparator]} />
				</StyledRow>
				<StyledRow
					styledclass={[
						styles.traceDetailContentSpacing,
						StyledStyles.Spacing({
							margin: '1.5rem 1rem 0.5rem',
						}),
					]}
				>
					<Col flex={`${SPAN_DETAILS_LEFT_COL_WIDTH}px`}>
						{/* <Search
							placeholder="Type to filter.."
							allowClear
							onSearch={onSearchHandler}
							style={{ width: 200 }}
						/> */}
					</Col>
					<Col flex="auto">
						<StyledSpace styledclass={[styles.floatRight]}>
							<Button onClick={onFocusSelectedSpanHandler} icon={<FilterOutlined />}>
								Focus on selected span
							</Button>
							<Button type="default" onClick={onResetHandler}>
								Reset Focus
							</Button>
						</StyledSpace>
					</Col>
				</StyledRow>
				<StyledDiv styledclass={[styles.ganttChartContainer]}>
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
				</StyledDiv>
			</StyledCol>
			<Col>
				<StyledDivider styledclass={[styles.verticalSeparator]} type="vertical" />
			</Col>
			<StyledCol md={5} sm={5} styledclass={[styles.selectedSpanDetailContainer]}>
				<SelectedSpanDetails tree={getSelectedNode} />
			</StyledCol>
		</StyledRow>
	);
}

interface TraceDetailProps {
	response: PayloadProps;
}

export default TraceDetail;
