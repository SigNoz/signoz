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
import { map } from 'lodash-es';
import { SPAN_DETAILS_LEFT_COL_WIDTH } from 'pages/TraceDetail/constants';
import React, { useEffect, useMemo, useState } from 'react';
import { ITraceForest, PayloadProps } from 'types/api/trace/getTraceItem';
import { getSpanTreeMetadata } from 'utils/getSpanTreeMetadata';
import { spanToTreeUtil } from 'utils/spanToTree';

import MissingSpansMessage from './Missingtrace';
import SelectedSpanDetails from './SelectedSpanDetails';
import * as styles from './styles';
import { FlameGraphMissingSpansContainer, GanttChartWrapper } from './styles';
import {
	formUrlParams,
	getSortedData,
	getTreeLevelsCount,
	IIntervalUnit,
	INTERVAL_UNITS,
} from './utils';

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
	const { levelDown, levelUp } = useMemo(
		() => ({
			levelDown: urlQuery.get('levelDown'),
			levelUp: urlQuery.get('levelUp'),
		}),
		[urlQuery],
	);
	const [treesData, setTreesData] = useState<ITraceForest>(
		spanToTreeUtil(response[0].events),
	);

	const { treesData: tree, ...traceMetaData } = useMemo(() => {
		const sortedTreesData: ITraceForest = {
			spanTree: map(treesData.spanTree, (tree) => getSortedData(tree)),
			missingSpanTree: map(
				treesData.missingSpanTree,
				(tree) => getSortedData(tree) || [],
			),
		};
		// Note: Handle undefined
		/*eslint-disable */
		return getSpanTreeMetadata(sortedTreesData, spanServiceColors);
		/* eslint-enable */
	}, [treesData, spanServiceColors]);

	const [globalTraceMetadata] = useState<ITraceMetaData>({
		...traceMetaData,
	});

	useEffect(() => {
		if (activeSelectedId) {
			history.replace({
				pathname: history.location.pathname,
				search: `${formUrlParams({
					spanId: activeSelectedId,
					levelUp,
					levelDown,
				})}`,
			});
		}
	}, [activeSelectedId, levelDown, levelUp]);

	const getSelectedNode = useMemo(() => {
		return getNodeById(activeSelectedId, treesData);
	}, [activeSelectedId, treesData]);

	// const onSearchHandler = (value: string) => {
	// 	setSearchSpanString(value);
	// 	setTreeData(spanToTreeUtil(response[0].events));
	// };

	const onFocusSelectedSpanHandler = (): void => {
		const treeNode = getNodeById(activeSelectedId, tree);

		if (treeNode) {
			setTreesData(treeNode);
		}
	};

	const onResetHandler = (): void => {
		setTreesData(spanToTreeUtil(response[0].events));
	};

	const hasMissingSpans = useMemo(
		(): boolean =>
			tree.missingSpanTree &&
			Array.isArray(tree.missingSpanTree) &&
			tree.missingSpanTree.length > 0,
		[tree],
	);

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
						{hasMissingSpans && <MissingSpansMessage />}
					</StyledCol>
					<Col flex="auto">
						{map(tree.spanTree, (tree) => {
							return (
								<TraceFlameGraph
									key={tree as never}
									treeData={tree}
									traceMetaData={traceMetaData}
									hoveredSpanId={activeHoverId}
									selectedSpanId={activeSelectedId}
									onSpanHover={setActiveHoverId}
									onSpanSelect={setActiveSelectedId}
									missingSpanTree={false}
								/>
							);
						})}

						{hasMissingSpans && (
							<FlameGraphMissingSpansContainer>
								{map(tree.missingSpanTree, (tree) => {
									return (
										<TraceFlameGraph
											key={tree as never}
											treeData={tree}
											traceMetaData={{
												...traceMetaData,
												levels: getTreeLevelsCount(tree),
											}}
											hoveredSpanId={activeHoverId}
											selectedSpanId={activeSelectedId}
											onSpanHover={setActiveHoverId}
											onSpanSelect={setActiveSelectedId}
											missingSpanTree
										/>
									);
								})}
							</FlameGraphMissingSpansContainer>
						)}
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
						{tree &&
							traceMetaData.globalStart &&
							dayjs(traceMetaData.globalStart).format('hh:mm:ss a MM/DD')}
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
					<Col flex={`${SPAN_DETAILS_LEFT_COL_WIDTH}px`} />
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
					<GanttChartWrapper>
						{map([...tree.spanTree, ...tree.missingSpanTree], (tree) => (
							<GanttChart
								key={tree as never}
								traceMetaData={traceMetaData}
								data={tree}
								activeSelectedId={activeSelectedId}
								activeHoverId={activeHoverId}
								setActiveHoverId={setActiveHoverId}
								setActiveSelectedId={setActiveSelectedId}
								spanId={spanId || ''}
								intervalUnit={intervalUnit}
							/>
						))}
						{/* {map(tree.missingSpanTree, (tree) => (
							<GanttChart
								key={tree as never}
								traceMetaData={traceMetaData}
								data={tree}
								activeSelectedId={activeSelectedId}
								activeHoverId={activeHoverId}
								setActiveHoverId={setActiveHoverId}
								setActiveSelectedId={setActiveSelectedId}
								spanId={spanId || ''}
								intervalUnit={intervalUnit}
							/>
						))} */}
					</GanttChartWrapper>
				</StyledDiv>
			</StyledCol>
			<Col>
				<StyledDivider styledclass={[styles.verticalSeparator]} type="vertical" />
			</Col>
			<StyledCol md={5} sm={5} styledclass={[styles.selectedSpanDetailContainer]}>
				<SelectedSpanDetails
					tree={[
						...(getSelectedNode.spanTree ? getSelectedNode.spanTree : []),
						...(getSelectedNode.missingSpanTree
							? getSelectedNode.missingSpanTree
							: []),
					]
						.filter(Boolean)
						.find((tree) => tree)}
				/>
			</StyledCol>
		</StyledRow>
	);
}

interface TraceDetailProps {
	response: PayloadProps;
}

export default TraceDetail;
