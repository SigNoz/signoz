import './TraceDetails.styles.scss';

import { FilterOutlined } from '@ant-design/icons';
import { Button, Col, Layout, Typography } from 'antd';
import cx from 'classnames';
import {
	StyledCol,
	StyledDiv,
	StyledDivider,
	StyledRow,
	StyledSpace,
	StyledTypography,
} from 'components/Styled';
import { Flex, Spacing } from 'components/Styled/styles';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import GanttChart, { ITraceMetaData } from 'container/GantChart';
import { getNodeById } from 'container/GantChart/utils';
import Timeline from 'container/Timeline';
import TraceFlameGraph from 'container/TraceFlameGraph';
import dayjs from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import { spanServiceNameToColorMapping } from 'lib/getRandomColor';
import history from 'lib/history';
import { map } from 'lodash-es';
import { PanelRight } from 'lucide-react';
import { SPAN_DETAILS_LEFT_COL_WIDTH } from 'pages/TraceDetail/constants';
import { useTimezone } from 'providers/Timezone';
import { useEffect, useMemo, useState } from 'react';
import { ITraceForest, PayloadProps } from 'types/api/trace/getTraceItem';
import { getSpanTreeMetadata } from 'utils/getSpanTreeMetadata';
import { spanToTreeUtil } from 'utils/spanToTree';

import MissingSpansMessage from './Missingtrace';
import SelectedSpanDetails from './SelectedSpanDetails';
import * as styles from './styles';
import { FlameGraphMissingSpansContainer, GanttChartWrapper } from './styles';
import SubTreeMessage from './SubTree';
import {
	formUrlParams,
	getSortedData,
	getTreeLevelsCount,
	IIntervalUnit,
	INTERVAL_UNITS,
} from './utils';

const { Sider } = Layout;

function TraceDetail({ response }: TraceDetailProps): JSX.Element {
	const spanServiceColors = useMemo(
		() => spanServiceNameToColorMapping(response[0].events),
		[response],
	);

	const traceStartTime = useMemo(() => response[0].startTimestampMillis, [
		response,
	]);

	const traceEndTime = useMemo(() => response[0].endTimestampMillis, [response]);

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

	const firstSpanStartTime = tree.spanTree[0]?.startTime;

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

	const getSelectedNode = useMemo(
		() => getNodeById(activeSelectedId, treesData),
		[activeSelectedId, treesData],
	);

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

	const isGlobalTimeVisible = tree && traceMetaData.globalStart;
	const [collapsed, setCollapsed] = useState(false);

	const isDarkMode = useIsDarkMode();

	const { timezone } = useTimezone();

	return (
		<StyledRow styledclass={[Flex({ flex: 1 })]}>
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
							{traceMetaData.totalSpans} Spans
						</StyledTypography.Text>
						{hasMissingSpans && <MissingSpansMessage />}
						{response[0]?.isSubTree && <SubTreeMessage />}
					</StyledCol>
					<Col flex="auto">
						{map(tree.spanTree, (tree) => (
							<TraceFlameGraph
								key={tree.id}
								treeData={tree}
								traceMetaData={traceMetaData}
								hoveredSpanId={activeHoverId}
								selectedSpanId={activeSelectedId}
								onSpanHover={setActiveHoverId}
								onSpanSelect={setActiveSelectedId}
								missingSpanTree={false}
							/>
						))}

						{hasMissingSpans && (
							<FlameGraphMissingSpansContainer>
								{map(tree.missingSpanTree, (tree) => (
									<TraceFlameGraph
										key={tree.id}
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
								))}
							</FlameGraphMissingSpansContainer>
						)}
					</Col>
				</StyledRow>
				<StyledRow styledclass={[styles.traceDateAndTimelineContainer]}>
					{isGlobalTimeVisible && (
						<styles.TimeStampContainer flex={`${SPAN_DETAILS_LEFT_COL_WIDTH}px`}>
							<Typography>
								{dayjs(traceMetaData.globalStart)
									.tz(timezone.value)
									.format(DATE_TIME_FORMATS.UTC_TIME_DATE)}
							</Typography>
						</styles.TimeStampContainer>
					)}

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
						Spacing({
							margin: '1.5rem 1rem 0.5rem',
						}),
					]}
				>
					<Col flex={`${SPAN_DETAILS_LEFT_COL_WIDTH}px`} />
					<Col flex="auto">
						<StyledSpace styledclass={[styles.floatRight]}>
							<Button
								onClick={onFocusSelectedSpanHandler}
								icon={<FilterOutlined />}
								data-testid="span-focus-btn"
							>
								Focus on selected span
							</Button>
							<Button
								type="default"
								onClick={onResetHandler}
								data-testid="reset-focus"
							>
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
					</GanttChartWrapper>
				</StyledDiv>
			</StyledCol>

			<Col>
				<StyledDivider styledclass={[styles.verticalSeparator]} type="vertical" />
			</Col>

			<Sider
				className={cx('span-details-sider', isDarkMode ? 'dark' : 'light')}
				style={{ background: isDarkMode ? '#0b0c0e' : '#fff' }}
				theme={isDarkMode ? 'dark' : 'light'}
				collapsible
				collapsed={collapsed}
				reverseArrow
				width={300}
				collapsedWidth={48}
				defaultCollapsed
				trigger={null}
				data-testid="span-details-sider"
			>
				<StyledCol styledclass={[styles.selectedSpanDetailContainer]}>
					{collapsed ? (
						<Button
							className="periscope-btn nav-item-label expand-collapse-btn"
							icon={<PanelRight size={16} />}
							onClick={(): void => setCollapsed((prev) => !prev)}
						/>
					) : (
						<SelectedSpanDetails
							setCollapsed={setCollapsed}
							firstSpanStartTime={firstSpanStartTime}
							traceStartTime={traceStartTime}
							traceEndTime={traceEndTime}
							tree={[
								...(getSelectedNode.spanTree ? getSelectedNode.spanTree : []),
								...(getSelectedNode.missingSpanTree
									? getSelectedNode.missingSpanTree
									: []),
							]
								.filter(Boolean)
								.find((tree) => tree)}
						/>
					)}
				</StyledCol>
			</Sider>
		</StyledRow>
	);
}

interface TraceDetailProps {
	response: PayloadProps;
}

export default TraceDetail;
