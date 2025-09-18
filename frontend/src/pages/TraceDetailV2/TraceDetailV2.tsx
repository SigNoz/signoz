import './TraceDetailV2.styles.scss';

import { UnorderedListOutlined } from '@ant-design/icons';
import { Button, Tabs } from 'antd';
import FlamegraphImg from 'assets/TraceDetail/Flamegraph';
import TraceFlamegraph from 'container/PaginatedTraceFlamegraph/PaginatedTraceFlamegraph';
import SpanDetailsDrawer from 'container/SpanDetailsDrawer/SpanDetailsDrawer';
import SpanList from 'container/SpanList/SpanList';
import TraceMetadata from 'container/TraceMetadata/TraceMetadata';
import TraceWaterfall, {
	IInterestedSpan,
} from 'container/TraceWaterfall/TraceWaterfall';
import useGetTraceV2 from 'hooks/trace/useGetTraceV2';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { defaultTo } from 'lodash-es';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Span, TraceDetailV2URLProps } from 'types/api/trace/getTraceV2';

import NoData from './NoData/NoData';

function TraceDetailsV2(): JSX.Element {
	const { id: traceId } = useParams<TraceDetailV2URLProps>();
	const urlQuery = useUrlQuery();
	const { safeNavigate } = useSafeNavigate();
	const [activeTab, setActiveTab] = useState<string>(() => {
		const viewParam = urlQuery.get('view');
		return viewParam === 'span-list' ? 'span-list' : 'flamegraph';
	});
	const [interestedSpanId, setInterestedSpanId] = useState<IInterestedSpan>(
		() => ({
			spanId: urlQuery.get('spanId') || '',
			isUncollapsed: urlQuery.get('spanId') !== '',
		}),
	);
	const [
		traceFlamegraphStatsWidth,
		setTraceFlamegraphStatsWidth,
	] = useState<number>(450);
	const [isSpanDetailsDocked, setIsSpanDetailsDocked] = useState<boolean>(false);
	const [selectedSpan, setSelectedSpan] = useState<Span>();

	useEffect(() => {
		setInterestedSpanId({
			spanId: urlQuery.get('spanId') || '',
			isUncollapsed: urlQuery.get('spanId') !== '',
		});
	}, [urlQuery]);

	const [uncollapsedNodes, setUncollapsedNodes] = useState<string[]>([]);
	const {
		data: traceData,
		isFetching: isFetchingTraceData,
		error: errorFetchingTraceData,
	} = useGetTraceV2({
		traceId,
		uncollapsedSpans: uncollapsedNodes,
		selectedSpanId: interestedSpanId.spanId,
		isSelectedSpanIDUnCollapsed: interestedSpanId.isUncollapsed,
	});

	useEffect(() => {
		if (traceData && traceData.payload && traceData.payload.uncollapsedSpans) {
			setUncollapsedNodes(traceData.payload.uncollapsedSpans);
		}
	}, [traceData]);

	useEffect(() => {
		if (selectedSpan) {
			setIsSpanDetailsDocked(false);
		}
	}, [selectedSpan]);

	const noData = useMemo(
		() =>
			!isFetchingTraceData &&
			!errorFetchingTraceData &&
			defaultTo(traceData?.payload?.spans?.length, 0) === 0,
		[
			errorFetchingTraceData,
			isFetchingTraceData,
			traceData?.payload?.spans?.length,
		],
	);

	useEffect(() => {
		if (noData) {
			setIsSpanDetailsDocked(true);
		}
	}, [noData]);

	const handleTabChange = useCallback(
		(key: string) => {
			const urlQueryParams = new URLSearchParams();

			if (key === 'span-list') {
				urlQueryParams.set('view', 'span-list');

				setIsSpanDetailsDocked(true);
				setSelectedSpan(undefined);
			} else if (selectedSpan) {
				setIsSpanDetailsDocked(false);
			}

			safeNavigate({ search: urlQueryParams.toString() });
			setActiveTab(key);
		},
		[safeNavigate, selectedSpan],
	);

	// Sync tab state with URL changes
	useEffect(() => {
		const viewParam = urlQuery.get('view');
		const newActiveTab = viewParam === 'span-list' ? 'span-list' : 'flamegraph';
		if (viewParam === 'span-list') {
			setIsSpanDetailsDocked(true);
			setSelectedSpan(undefined);
		} else {
			setIsSpanDetailsDocked(false);
		}
		if (newActiveTab !== activeTab) {
			setActiveTab(newActiveTab);
		}
	}, [urlQuery, activeTab, selectedSpan]);

	const items = [
		{
			label: (
				<Button
					type="text"
					icon={<FlamegraphImg />}
					className="flamegraph-waterfall-toggle"
				>
					Flamegraph
				</Button>
			),
			key: 'flamegraph',
			children: (
				<>
					<TraceFlamegraph
						serviceExecTime={traceData?.payload?.serviceNameToTotalDurationMap || {}}
						startTime={traceData?.payload?.startTimestampMillis || 0}
						endTime={traceData?.payload?.endTimestampMillis || 0}
						traceFlamegraphStatsWidth={traceFlamegraphStatsWidth}
						selectedSpan={selectedSpan}
					/>
					<TraceWaterfall
						traceData={traceData}
						isFetchingTraceData={isFetchingTraceData}
						errorFetchingTraceData={errorFetchingTraceData}
						traceId={traceId}
						interestedSpanId={interestedSpanId}
						setInterestedSpanId={setInterestedSpanId}
						uncollapsedNodes={uncollapsedNodes}
						setTraceFlamegraphStatsWidth={setTraceFlamegraphStatsWidth}
						selectedSpan={selectedSpan}
						setSelectedSpan={setSelectedSpan}
					/>
				</>
			),
		},
		{
			label: (
				<Button
					type="text"
					icon={<UnorderedListOutlined />}
					className="flamegraph-waterfall-toggle"
				>
					Span list
				</Button>
			),
			key: 'span-list',
			children: (
				<SpanList
					traceId={traceId}
					setSelectedSpan={setSelectedSpan}
					traceData={traceData}
				/>
			),
		},
	];

	return (
		<div className="trace-layout">
			<div
				className="trace-left-content"
				style={{ width: `calc(100% - ${isSpanDetailsDocked ? 48 : 330}px)` }}
			>
				<TraceMetadata
					traceID={traceId}
					duration={
						(traceData?.payload?.endTimestampMillis || 0) -
						(traceData?.payload?.startTimestampMillis || 0)
					}
					startTime={(traceData?.payload?.startTimestampMillis || 0) / 1e3}
					rootServiceName={traceData?.payload?.rootServiceName || ''}
					rootSpanName={traceData?.payload?.rootServiceEntryPoint || ''}
					totalErrorSpans={traceData?.payload?.totalErrorSpansCount || 0}
					totalSpans={traceData?.payload?.totalSpansCount || 0}
					notFound={noData}
				/>
				{!noData ? (
					<Tabs
						items={items}
						animated
						className="trace-visualisation-tabs"
						activeKey={activeTab}
						onChange={handleTabChange}
					/>
				) : (
					<NoData />
				)}
			</div>
			<SpanDetailsDrawer
				isSpanDetailsDocked={isSpanDetailsDocked}
				setIsSpanDetailsDocked={setIsSpanDetailsDocked}
				selectedSpan={selectedSpan}
				traceID={traceId}
				traceStartTime={traceData?.payload?.startTimestampMillis || 0}
				traceEndTime={traceData?.payload?.endTimestampMillis || 0}
			/>
		</div>
	);
}

export default TraceDetailsV2;
