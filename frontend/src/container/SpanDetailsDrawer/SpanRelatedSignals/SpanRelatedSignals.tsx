import './SpanRelatedSignals.styles.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import { Button, Divider, Drawer, Typography } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import LogsIcon from 'assets/AlertHistory/LogsIcon';
import SignozRadioGroup from 'components/SignozRadioGroup/SignozRadioGroup';
import { QueryParams } from 'constants/query';
import {
	initialQueryBuilderFormValuesMap,
	initialQueryState,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import InfraMetrics from 'container/LogDetailedView/InfraMetrics/InfraMetrics';
import { getEmptyLogsListConfig } from 'container/LogsExplorerList/utils';
import dayjs from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { BarChart2, Compass, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Span } from 'types/api/trace/getTraceV2';
import { DataSource, LogsAggregatorOperator } from 'types/common/queryBuilder';

import { RelatedSignalsViews } from '../constants';
import SpanLogs from '../SpanLogs/SpanLogs';
import { useSpanContextLogs } from '../SpanLogs/useSpanContextLogs';
import { hasInfraMetadata } from '../utils';

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

interface SpanRelatedSignalsProps {
	selectedSpan: Span;
	traceStartTime: number;
	traceEndTime: number;
	isOpen: boolean;
	onClose: () => void;
	initialView: RelatedSignalsViews;
}

function SpanRelatedSignals({
	selectedSpan,
	traceStartTime,
	traceEndTime,
	isOpen,
	onClose,
	initialView,
}: SpanRelatedSignalsProps): JSX.Element {
	const [selectedView, setSelectedView] = useState<RelatedSignalsViews>(
		initialView,
	);
	const isDarkMode = useIsDarkMode();

	// Extract infrastructure metadata from span attributes
	const infraMetadata = useMemo(() => {
		// Only return metadata if span has infrastructure metadata
		if (!hasInfraMetadata(selectedSpan)) {
			return null;
		}

		return {
			clusterName: selectedSpan.tagMap['k8s.cluster.name'] || '',
			podName: selectedSpan.tagMap['k8s.pod.name'] || '',
			nodeName: selectedSpan.tagMap['k8s.node.name'] || '',
			hostName: selectedSpan.tagMap['host.name'] || '',
			spanTimestamp: dayjs(selectedSpan.timestamp).format(),
		};
	}, [selectedSpan]);
	const {
		logs,
		isLoading,
		isError,
		isFetching,
		isLogSpanRelated,
		hasTraceIdLogs,
	} = useSpanContextLogs({
		traceId: selectedSpan.traceId,
		spanId: selectedSpan.spanId,
		timeRange: {
			startTime: traceStartTime - FIVE_MINUTES_IN_MS,
			endTime: traceEndTime + FIVE_MINUTES_IN_MS,
		},
		isDrawerOpen: isOpen,
	});

	const handleTabChange = useCallback((e: RadioChangeEvent): void => {
		setSelectedView(e.target.value);
	}, []);

	const tabOptions = useMemo(() => {
		const baseOptions = [
			{
				label: (
					<div className="view-title">
						<LogsIcon width={14} height={14} />
						Logs
					</div>
				),
				value: RelatedSignalsViews.LOGS,
			},
		];

		// Add Infra option if infrastructure metadata is available
		if (infraMetadata) {
			baseOptions.push({
				label: (
					<div className="view-title">
						<BarChart2 size={14} />
						Metrics
					</div>
				),
				value: RelatedSignalsViews.INFRA,
			});
		}

		return baseOptions;
	}, [infraMetadata]);

	const handleExplorerPageRedirect = useCallback((): void => {
		const startTimeMs = traceStartTime - FIVE_MINUTES_IN_MS;
		const endTimeMs = traceEndTime + FIVE_MINUTES_IN_MS;

		const traceIdFilter = {
			op: 'AND',
			items: [
				{
					id: 'trace-id-filter',
					key: {
						key: 'trace_id',
						id: 'trace-id-key',
						dataType: 'string' as const,
						isColumn: true,
						type: '',
						isJSON: false,
					} as BaseAutocompleteData,
					op: '=',
					value: selectedSpan.traceId,
				},
			],
		};

		const compositeQuery = {
			...initialQueryState,
			queryType: 'builder',
			builder: {
				...initialQueryState.builder,
				queryData: [
					{
						...initialQueryBuilderFormValuesMap.logs,
						aggregateOperator: LogsAggregatorOperator.NOOP,
						filters: traceIdFilter,
					},
				],
			},
		};

		const searchParams = new URLSearchParams();
		searchParams.set(QueryParams.compositeQuery, JSON.stringify(compositeQuery));
		searchParams.set(QueryParams.startTime, startTimeMs.toString());
		searchParams.set(QueryParams.endTime, endTimeMs.toString());

		window.open(
			`${window.location.origin}${
				ROUTES.LOGS_EXPLORER
			}?${searchParams.toString()}`,
			'_blank',
			'noopener,noreferrer',
		);
	}, [selectedSpan.traceId, traceStartTime, traceEndTime]);

	const emptyStateConfig = useMemo(
		() => ({
			...getEmptyLogsListConfig(() => {}),
			showClearFiltersButton: false,
		}),
		[],
	);

	return (
		<Drawer
			width="50%"
			title={
				<>
					<Divider type="vertical" />
					<Typography.Text className="title">
						Related Signals - {selectedSpan.name}
					</Typography.Text>
				</>
			}
			placement="right"
			onClose={onClose}
			open={isOpen}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="span-related-signals-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			{selectedSpan && (
				<div className="span-related-signals-drawer__content">
					<div className="views-tabs-container">
						<SignozRadioGroup
							value={selectedView}
							options={tabOptions}
							onChange={handleTabChange}
							className="related-signals-radio"
						/>
						{selectedView === RelatedSignalsViews.LOGS && (
							<Button
								icon={<Compass size={18} />}
								className="open-in-explorer"
								onClick={handleExplorerPageRedirect}
								data-testid="open-in-explorer-button"
							>
								Open in Logs Explorer
							</Button>
						)}
					</div>

					{selectedView === RelatedSignalsViews.LOGS && (
						<SpanLogs
							traceId={selectedSpan.traceId}
							spanId={selectedSpan.spanId}
							timeRange={{
								startTime: traceStartTime - FIVE_MINUTES_IN_MS,
								endTime: traceEndTime + FIVE_MINUTES_IN_MS,
							}}
							logs={logs}
							isLoading={isLoading}
							isError={isError}
							isFetching={isFetching}
							isLogSpanRelated={isLogSpanRelated}
							handleExplorerPageRedirect={handleExplorerPageRedirect}
							emptyStateConfig={!hasTraceIdLogs ? emptyStateConfig : undefined}
						/>
					)}

					{selectedView === RelatedSignalsViews.INFRA && infraMetadata && (
						<InfraMetrics
							clusterName={infraMetadata.clusterName}
							podName={infraMetadata.podName}
							nodeName={infraMetadata.nodeName}
							hostName={infraMetadata.hostName}
							timestamp={infraMetadata.spanTimestamp}
							dataSource={DataSource.TRACES}
						/>
					)}
				</div>
			)}
		</Drawer>
	);
}

export default SpanRelatedSignals;
