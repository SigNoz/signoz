import { useCallback, useMemo, useState } from 'react';
import { Badge } from '@signozhq/ui/badge';
import {
	TabsContent,
	TabsList,
	TabsRoot,
	TabsTrigger,
} from '@signozhq/ui/tabs';
import { Bookmark, ChartColumnBig, List, ScrollText } from '@signozhq/icons';
import { Skeleton } from 'antd';
import { DetailsHeader, DetailsPanelDrawer } from 'components/DetailsPanel';
import { HeaderAction } from 'components/DetailsPanel/DetailsHeader/DetailsHeader';
import { DetailsPanelState } from 'components/DetailsPanel/types';
import { QueryParams } from 'constants/query';
import {
	initialQueryBuilderFormValuesMap,
	initialQueryState,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import InfraMetrics from 'container/LogDetailedView/InfraMetrics/InfraMetrics';
import { getEmptyLogsListConfig } from 'container/LogsExplorerList/utils';
import dayjs from 'dayjs';
import {
	TraceDetailEventKeys,
	TraceDetailEvents,
} from 'pages/TraceDetailsV3/events';
import { useMigratePinnedAttributes } from 'pages/TraceDetailsV3/hooks/useMigratePinnedAttributes';
import { useTraceDetailLogEvent } from 'pages/TraceDetailsV3/hooks/useTraceDetailLogEvent';
import {
	getSpanAttribute,
	getSpanDisplayData,
	hasInfraMetadata,
} from 'pages/TraceDetailsV3/utils';
import { DataViewer } from 'periscope/components/DataViewer';
import { FloatingPanel } from 'periscope/components/FloatingPanel';
import { getLeafKeyFromPath } from 'periscope/components/PrettyView/utils';
import { useMeasure } from 'react-use';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { SpanV3 } from 'types/api/trace/getTraceV3';
import { DataSource, LogsAggregatorOperator } from 'types/common/queryBuilder';
import { openInNewTab } from 'utils/navigation';

import {
	// KEY_ATTRIBUTE_KEYS, // uncomment when key attributes section is re-enabled
	SpanDetailVariant,
	VISIBLE_ACTIONS,
} from './constants';
import DockModeSwitcher from './DockModeSwitcher';
import { useSpanAttributeActions } from './hooks/useSpanAttributeActions';
import { useTracePinnedFields } from './hooks/useTracePinnedFields';
import Events from './Events/Events';
import OpenInLogsExplorer from './SpanLogs/OpenInLogsExplorer';
import SpanLogs from './SpanLogs/SpanLogs';
import { useSpanContextLogs } from './SpanLogs/useSpanContextLogs';
import SpanSummary from './SpanSummary';

import styles from './SpanDetailsPanel.module.scss';

interface SpanDetailsPanelProps {
	panelState: DetailsPanelState;
	selectedSpan: SpanV3 | undefined;
	variant?: SpanDetailVariant;
	onVariantChange?: (variant: SpanDetailVariant) => void;
	traceStartTime?: number;
	traceEndTime?: number;
}

// At/above this panel width the summary moves inside the Overview tab (bottom
// dock, or a floating/right panel widened to match). ~right-dock max width.
const WIDE_PANEL_BREAKPOINT = 720;

// Context-log window padding around the span's trace time range.
const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

function SpanDetailsContent({
	selectedSpan,
	traceStartTime,
	traceEndTime,
}: {
	selectedSpan: SpanV3;
	traceStartTime?: number;
	traceEndTime?: number;
}): JSX.Element {
	const [bodyRef, { width: bodyWidth }] = useMeasure<HTMLDivElement>();
	const spanAttributeActions = useSpanAttributeActions();
	const logTraceEvent = useTraceDetailLogEvent('v3', selectedSpan.trace_id);
	// Tracked so the panel can render tab-specific chrome (the Logs footer)
	// outside the scrolling tab content.
	const [activeTab, setActiveTab] = useState('overview');
	const handleTabChange = useCallback(
		(tab: string): void => {
			setActiveTab(tab);
			logTraceEvent(TraceDetailEvents.SpanPanelTabChanged, {
				[TraceDetailEventKeys.Tab]: tab,
				[TraceDetailEventKeys.SpanId]: selectedSpan.span_id,
			});
		},
		[logTraceEvent, selectedSpan.span_id],
	);

	// One-time conversion of any V2-format value still living in the
	// `span_details_pinned_attributes` user pref into V3 nested-path format.
	useMigratePinnedAttributes(selectedSpan);
	const { value: pinnedFieldsValue, onChange: onPinnedFieldsChange } =
		useTracePinnedFields();

	const spanDisplayData = useMemo(
		() => getSpanDisplayData(selectedSpan),
		[selectedSpan],
	);

	// Map span attribute actions to PrettyView actions format.
	// Use the last key in fieldKeyPath (the actual attribute key), not the full display path.
	const prettyViewCustomActions = useMemo(
		() =>
			spanAttributeActions.map((action) => ({
				key: action.value,
				label: action.label,
				icon: action.icon,
				shouldHide: action.shouldHide,
				onClick: (context: {
					fieldKey: string;
					fieldKeyPath: (string | number)[];
					fieldValue: unknown;
				}): void => {
					const leafKey = getLeafKeyFromPath(context.fieldKeyPath, context.fieldKey);
					action.callback({
						key: leafKey,
						value: String(context.fieldValue),
					});
				},
			})),
		[spanAttributeActions],
	);

	// const [, setCopy] = useCopyToClipboard();

	// Key attributes section — commented out as pinning in PrettyView covers this use case.
	// Uncomment when key attributes need to be shown separately.
	// const buildKeyAttrMenu = useCallback(
	// 	(key: string, value: string): ActionMenuItem[] => {
	// 		const items: ActionMenuItem[] = [
	// 			{
	// 				key: 'copy-value',
	// 				label: 'Copy Value',
	// 				icon: <Copy size={12} />,
	// 				onClick: (): void => {
	// 					setCopy(value);
	// 					toast.success('Copied to clipboard', {
	// 						richColors: true,
	// 						position: 'top-right',
	// 					});
	// 				},
	// 			},
	// 		];
	// 		spanAttributeActions.forEach((action) => {
	// 			if (action.shouldHide && action.shouldHide(key)) {
	// 				return;
	// 			}
	// 			items.push({
	// 				key: action.value,
	// 				label: action.label,
	// 				icon: action.icon,
	// 				onClick: (): void => {
	// 					action.callback({ key, value });
	// 				},
	// 			});
	// 		});
	// 		return items;
	// 	},
	// 	[spanAttributeActions, setCopy],
	// );

	const {
		logs,
		isLoading: isLogsLoading,
		isError: isLogsError,
		isFetching: isLogsFetching,
		isLogSpanRelated,
		hasTraceIdLogs,
	} = useSpanContextLogs({
		traceId: selectedSpan.trace_id,
		spanId: selectedSpan.span_id,
		timeRange: {
			startTime: (traceStartTime || 0) - FIVE_MINUTES_IN_MS,
			endTime: (traceEndTime || 0) + FIVE_MINUTES_IN_MS,
		},
		isDrawerOpen: true,
	});

	const infraMetadata = useMemo(() => {
		if (!hasInfraMetadata(selectedSpan)) {
			return null;
		}
		return {
			clusterName: getSpanAttribute(selectedSpan, 'k8s.cluster.name') || '',
			podName: getSpanAttribute(selectedSpan, 'k8s.pod.name') || '',
			nodeName: getSpanAttribute(selectedSpan, 'k8s.node.name') || '',
			hostName: getSpanAttribute(selectedSpan, 'host.name') || '',
			spanTimestamp: dayjs(selectedSpan.timestamp).format(),
		};
	}, [selectedSpan]);

	const handleExplorerPageRedirect = useCallback((): void => {
		const startTimeMs = (traceStartTime || 0) - FIVE_MINUTES_IN_MS;
		const endTimeMs = (traceEndTime || 0) + FIVE_MINUTES_IN_MS;

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
					value: selectedSpan.trace_id,
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

		openInNewTab(`${ROUTES.LOGS_EXPLORER}?${searchParams.toString()}`);
	}, [selectedSpan.trace_id, traceStartTime, traceEndTime]);

	const emptyLogsStateConfig = useMemo(
		() => ({
			...getEmptyLogsListConfig(() => {}),
			showClearFiltersButton: false,
		}),
		[],
	);

	// const keyAttributes = useMemo(() => {
	// 	const keys = KEY_ATTRIBUTE_KEYS.traces || [];
	// 	const allAttrs: Record<string, string> = {};
	// 	Object.entries(selectedSpan.resource || {}).forEach(([k, v]) => {
	// 		allAttrs[k] = String(v);
	// 	});
	// 	Object.entries(selectedSpan.attributes || {}).forEach(([k, v]) => {
	// 		allAttrs[k] = String(v);
	// 	});
	// 	const span = (selectedSpan as unknown) as Record<string, unknown>;
	// 	keys.forEach((key) => {
	// 		if (!(key in allAttrs) && span[key] != null && span[key] !== '') {
	// 			allAttrs[key] = String(span[key]);
	// 		}
	// 	});
	// 	return keys
	// 		.filter((key) => allAttrs[key])
	// 		.map((key) => ({ key, value: allAttrs[key] }));
	// }, [selectedSpan]);

	// Width-driven: when the panel is wide, the summary moves inside the Overview
	// tab; when narrow it stays above the tabs.
	const isWide = bodyWidth >= WIDE_PANEL_BREAKPOINT;
	const summary = (
		<SpanSummary
			selectedSpan={selectedSpan}
			traceStartTime={traceStartTime}
			traceEndTime={traceEndTime}
		/>
	);
	const eventsCount = selectedSpan.events?.length || 0;

	return (
		<>
			<div className={styles.panelBody} ref={bodyRef}>
				{!isWide && <div className={styles.detailsSection}>{summary}</div>}

				<div className={styles.tabsSection}>
					{/* Step 9: ContentTabs */}
					<TabsRoot defaultValue="overview" onValueChange={handleTabChange}>
						<TabsList variant="secondary">
							<TabsTrigger value="overview" variant="secondary">
								<Bookmark size={14} /> Overview
							</TabsTrigger>
							<TabsTrigger value="events" variant="secondary">
								<ScrollText size={14} /> Events
								{eventsCount > 0 && (
									<Badge color="secondary" className={styles.eventsBadge}>
										{eventsCount}
									</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger value="logs" variant="secondary">
								<List size={14} /> Logs
							</TabsTrigger>
							{infraMetadata && (
								<TabsTrigger value="metrics" variant="secondary">
									<ChartColumnBig size={14} /> Metrics
								</TabsTrigger>
							)}
						</TabsList>

						<div className={styles.tabsScroll}>
							<TabsContent value="overview">
								{isWide && summary}
								<DataViewer
									data={spanDisplayData}
									drawerKey="trace-details"
									prettyViewProps={{
										showPinned: true,
										actions: prettyViewCustomActions,
										visibleActions: VISIBLE_ACTIONS,
										pinnedFieldsValue,
										onPinnedFieldsChange,
									}}
								/>
							</TabsContent>
							<TabsContent value="events">
								<Events
									span={selectedSpan}
									startTime={traceStartTime || 0}
									isSearchVisible
								/>
							</TabsContent>
							<TabsContent value="logs">
								<SpanLogs
									traceId={selectedSpan.trace_id}
									spanId={selectedSpan.span_id}
									timeRange={{
										startTime: (traceStartTime || 0) - FIVE_MINUTES_IN_MS,
										endTime: (traceEndTime || 0) + FIVE_MINUTES_IN_MS,
									}}
									logs={logs}
									isLoading={isLogsLoading}
									isError={isLogsError}
									isFetching={isLogsFetching}
									isLogSpanRelated={isLogSpanRelated}
									handleExplorerPageRedirect={handleExplorerPageRedirect}
									emptyStateConfig={!hasTraceIdLogs ? emptyLogsStateConfig : undefined}
								/>
							</TabsContent>
							{infraMetadata && (
								<TabsContent value="metrics">
									<InfraMetrics
										clusterName={infraMetadata.clusterName}
										podName={infraMetadata.podName}
										nodeName={infraMetadata.nodeName}
										hostName={infraMetadata.hostName}
										timestamp={infraMetadata.spanTimestamp}
										dataSource={DataSource.TRACES}
									/>
								</TabsContent>
							)}
						</div>
					</TabsRoot>
				</div>
			</div>

			{/* Sibling of the scrolling panelBody, so it's a true fixed footer flush
			    with the panel's bottom edge — always visible, never scrolls. */}
			{activeTab === 'logs' && (
				<div className={styles.logsFooter}>
					<OpenInLogsExplorer onClick={handleExplorerPageRedirect} />
				</div>
			)}
		</>
	);
}

function SpanDetailsPanel({
	panelState,
	selectedSpan,
	variant = SpanDetailVariant.DIALOG,
	onVariantChange,
	traceStartTime,
	traceEndTime,
}: SpanDetailsPanelProps): JSX.Element {
	const headerActions = useMemo((): HeaderAction[] => {
		const actions: HeaderAction[] = [
			// TODO: Add back when driven through separate config for different pages
			// {
			// 	key: 'view-full-trace',
			// 	component: (
			// 		<Button variant="ghost" size="sm" color="secondary" prefixIcon={<ExternalLink size={14} />} onClick={noop}>
			// 			View full trace
			// 		</Button>
			// 	),
			// },
			// TODO: Add back when used in trace explorer page
			// {
			// 	key: 'nav',
			// 	component: (
			// 		<div className="span-details-panel__header-nav">
			// 			<Button variant="ghost" size="icon" color="secondary" onClick={noop}><ChevronUp size={14} /></Button>
			// 			<Button variant="ghost" size="icon" color="secondary" onClick={noop}><ChevronDown size={14} /></Button>
			// 		</div>
			// 	),
			// },
		];

		if (onVariantChange) {
			actions.push({
				key: 'dock-mode',
				component: (
					<DockModeSwitcher
						value={variant}
						onChange={onVariantChange}
						tooltipClassName={styles.dockToggleTooltip}
					/>
				),
			});
		}

		return actions;
	}, [variant, onVariantChange]);

	const PANEL_WIDTH = 500;
	const PANEL_MARGIN_RIGHT = 20;
	const PANEL_MARGIN_TOP = 50;
	const PANEL_MARGIN_BOTTOM = 25;

	const content = (
		<>
			<DetailsHeader
				title="Span details"
				onClose={panelState.close}
				actions={headerActions}
				className={
					variant === SpanDetailVariant.DIALOG ? 'floating-panel__drag-handle' : ''
				}
			/>
			{selectedSpan ? (
				<SpanDetailsContent
					selectedSpan={selectedSpan}
					traceStartTime={traceStartTime}
					traceEndTime={traceEndTime}
				/>
			) : (
				<div className={styles.panelBody}>
					<Skeleton active paragraph={{ rows: 6 }} title={{ width: '60%' }} />
				</div>
			)}
		</>
	);

	if (
		variant === SpanDetailVariant.DOCKED ||
		variant === SpanDetailVariant.DOCKED_RIGHT
	) {
		return <div className={styles.panel}>{content}</div>;
	}

	if (variant === SpanDetailVariant.DRAWER) {
		return (
			<DetailsPanelDrawer
				isOpen={panelState.isOpen}
				onClose={panelState.close}
				className={styles.panel}
			>
				{content}
			</DetailsPanelDrawer>
		);
	}

	return (
		<FloatingPanel
			isOpen={panelState.isOpen}
			className={styles.panel}
			width={PANEL_WIDTH}
			minWidth={480}
			height={window.innerHeight - PANEL_MARGIN_TOP - PANEL_MARGIN_BOTTOM}
			defaultPosition={{
				x: window.innerWidth - PANEL_WIDTH - PANEL_MARGIN_RIGHT,
				y: PANEL_MARGIN_TOP,
			}}
			enableResizing={{
				top: true,
				right: true,
				bottom: true,
				left: true,
				topRight: false,
				bottomRight: false,
				bottomLeft: false,
				topLeft: false,
			}}
		>
			{content}
		</FloatingPanel>
	);
}

export default SpanDetailsPanel;
