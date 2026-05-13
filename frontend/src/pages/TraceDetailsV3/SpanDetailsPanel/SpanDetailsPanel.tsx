import { useCallback, useMemo, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import {
	TabsContent,
	TabsList,
	TabsRoot,
	TabsTrigger,
} from '@signozhq/ui/tabs';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
import {
	Bookmark,
	CalendarClock,
	ChartBar,
	ChartColumnBig,
	Dock,
	Link2,
	Logs,
	PanelBottom,
	ScrollText,
	Timer,
} from '@signozhq/icons';
import { Skeleton } from 'antd';
import { DetailsHeader, DetailsPanelDrawer } from 'components/DetailsPanel';
import { HeaderAction } from 'components/DetailsPanel/DetailsHeader/DetailsHeader';
import { DetailsPanelState } from 'components/DetailsPanel/types';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { QueryParams } from 'constants/query';
import {
	initialQueryBuilderFormValuesMap,
	initialQueryState,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import InfraMetrics from 'container/LogDetailedView/InfraMetrics/InfraMetrics';
import { getEmptyLogsListConfig } from 'container/LogsExplorerList/utils';
import Events from 'container/SpanDetailsDrawer/Events/Events';
import SpanLogs from 'container/SpanDetailsDrawer/SpanLogs/SpanLogs';
import { useSpanContextLogs } from 'container/SpanDetailsDrawer/SpanLogs/useSpanContextLogs';
import dayjs from 'dayjs';
import { useMigratePinnedAttributes } from 'pages/TraceDetailsV3/hooks/useMigratePinnedAttributes';
import {
	getSpanAttribute,
	getSpanDisplayData,
	hasInfraMetadata,
} from 'pages/TraceDetailsV3/utils';
import { DataViewer } from 'periscope/components/DataViewer';
import { FloatingPanel } from 'periscope/components/FloatingPanel';
import KeyValueLabel from 'periscope/components/KeyValueLabel';
import { getLeafKeyFromPath } from 'periscope/components/PrettyView/utils';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { SpanV3 } from 'types/api/trace/getTraceV3';
import { DataSource, LogsAggregatorOperator } from 'types/common/queryBuilder';
import { openInNewTab } from 'utils/navigation';

import AnalyticsPanel from './AnalyticsPanel/AnalyticsPanel';
import { HIGHLIGHTED_OPTIONS } from './config';
import {
	// KEY_ATTRIBUTE_KEYS, // uncomment when key attributes section is re-enabled
	SpanDetailVariant,
	VISIBLE_ACTIONS,
} from './constants';
import { useSpanAttributeActions } from './hooks/useSpanAttributeActions';
import { useTracePinnedFields } from './hooks/useTracePinnedFields';
import {
	LinkedSpansPanel,
	LinkedSpansToggle,
	useLinkedSpans,
} from './LinkedSpans/LinkedSpans';
import SpanPercentileBadge from './SpanPercentile/SpanPercentileBadge';
import SpanPercentilePanel from './SpanPercentile/SpanPercentilePanel';
import useSpanPercentile from './SpanPercentile/useSpanPercentile';

import './SpanDetailsPanel.styles.scss';

interface SpanDetailsPanelProps {
	panelState: DetailsPanelState;
	selectedSpan: SpanV3 | undefined;
	variant?: SpanDetailVariant;
	onVariantChange?: (variant: SpanDetailVariant) => void;
	traceStartTime?: number;
	traceEndTime?: number;
}

function SpanDetailsContent({
	selectedSpan,
	traceStartTime,
	traceEndTime,
}: {
	selectedSpan: SpanV3;
	traceStartTime?: number;
	traceEndTime?: number;
}): JSX.Element {
	const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
	const spanAttributeActions = useSpanAttributeActions();
	const percentile = useSpanPercentile(selectedSpan);
	const linkedSpans = useLinkedSpans((selectedSpan as any).references);

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

	return (
		<div className="span-details-panel__body">
			<div className="span-details-panel__details-section">
				<div className="span-details-panel__span-row">
					<KeyValueLabel
						badgeKey="Span name"
						badgeValue={selectedSpan.name}
						maxCharacters={50}
					/>
					<SpanPercentileBadge
						loading={percentile.loading}
						percentileValue={percentile.percentileValue}
						duration={percentile.duration}
						spanPercentileData={percentile.spanPercentileData}
						isOpen={percentile.isOpen}
						toggleOpen={percentile.toggleOpen}
					/>
				</div>

				<SpanPercentilePanel selectedSpan={selectedSpan} percentile={percentile} />

				{/* Span info: exec time + start time */}
				<div className="span-details-panel__span-info">
					<div className="span-details-panel__span-info-item">
						<Timer size={14} />
						<span>
							{getYAxisFormattedValue(`${selectedSpan.duration_nano / 1000000}`, 'ms')}
							{traceStartTime && traceEndTime && traceEndTime > traceStartTime && (
								<>
									{' — '}
									<strong>
										{(
											(selectedSpan.duration_nano * 100) /
											((traceEndTime - traceStartTime) * 1e6)
										).toFixed(2)}
										%
									</strong>
									{' of total exec time'}
								</>
							)}
						</span>
					</div>
					<div className="span-details-panel__span-info-item">
						<CalendarClock size={14} />
						<span>
							{dayjs(selectedSpan.timestamp).format('HH:mm:ss — MMM D, YYYY')}
						</span>
					</div>
					<div className="span-details-panel__span-info-item">
						<Link2 size={14} />
						<LinkedSpansToggle
							count={linkedSpans.count}
							isOpen={linkedSpans.isOpen}
							toggleOpen={linkedSpans.toggleOpen}
						/>
					</div>
				</div>

				<LinkedSpansPanel
					linkedSpans={linkedSpans.linkedSpans}
					isOpen={linkedSpans.isOpen}
				/>

				{/* Step 6: HighlightedOptions */}
				<div className="span-details-panel__highlighted-options">
					{HIGHLIGHTED_OPTIONS.map((option) => {
						const rendered = option.render(selectedSpan);
						if (!rendered) {
							return null;
						}
						return (
							<KeyValueLabel
								key={option.key}
								badgeKey={option.label}
								badgeValue={rendered}
								direction="column"
							/>
						);
					})}
				</div>

				{/* Step 7: KeyAttributes — commented out, pinning in PrettyView covers this.
				{keyAttributes.length > 0 && (
					<div className="span-details-panel__key-attributes">
						<div className="span-details-panel__key-attributes-label">
							KEY ATTRIBUTES
						</div>
						<div className="span-details-panel__key-attributes-chips">
							{keyAttributes.map(({ key, value }) => (
								<ActionMenu
									key={key}
									items={buildKeyAttrMenu(key, value)}
									trigger={['click']}
									placement="bottomRight"
								>
									<div>
										<KeyValueLabel badgeKey={key} badgeValue={value} />
									</div>
								</ActionMenu>
							))}
						</div>
					</div>
				)}
			*/}

				{/* Step 8: MiniTraceContext */}
			</div>

			<div className="span-details-panel__tabs-section">
				{/* Step 9: ContentTabs */}
				<TabsRoot defaultValue="overview">
					<TabsList variant="secondary">
						<TabsTrigger value="overview" variant="secondary">
							<Bookmark size={14} /> Overview
						</TabsTrigger>
						<TabsTrigger value="events" variant="secondary">
							<ScrollText size={14} /> Events ({selectedSpan.events?.length || 0})
						</TabsTrigger>
						<TabsTrigger value="logs" variant="secondary">
							<Logs size={14} /> Logs
						</TabsTrigger>
						{infraMetadata && (
							<TabsTrigger value="metrics" variant="secondary">
								<ChartColumnBig size={14} /> Metrics
							</TabsTrigger>
						)}
					</TabsList>

					<div className="span-details-panel__tabs-scroll">
						<TabsContent value="overview">
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
							{/* V2 Events component expects span.event (singular), V3 has span.events (plural) */}
							<Events
								span={{ ...selectedSpan, event: selectedSpan.events } as any}
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
	const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

	const headerActions = useMemo((): HeaderAction[] => {
		const actions: HeaderAction[] = [
			{
				key: 'analytics',
				component: (
					<Button
						variant="ghost"
						size="sm"
						color="secondary"
						prefix={<ChartBar size={14} />}
						onClick={(): void => setIsAnalyticsOpen((prev) => !prev)}
					>
						Analytics
					</Button>
				),
			},
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
			const isDocked = variant === SpanDetailVariant.DOCKED;
			actions.push({
				key: 'dock-toggle',
				component: (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									color="secondary"
									onClick={(): void =>
										onVariantChange(
											isDocked ? SpanDetailVariant.DIALOG : SpanDetailVariant.DOCKED,
										)
									}
								>
									{isDocked ? <Dock size={14} /> : <PanelBottom size={14} />}
								</Button>
							</TooltipTrigger>
							<TooltipContent className="dock-toggle-tooltip">
								{isDocked ? 'Open as floating panel' : 'Dock at the bottom'}
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				),
			});
		}

		return actions;
	}, [variant, onVariantChange]);

	const PANEL_WIDTH = 500;
	const PANEL_MARGIN_RIGHT = 20;
	const PANEL_MARGIN_TOP = 25;
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
				<div className="span-details-panel__body">
					<Skeleton active paragraph={{ rows: 6 }} title={{ width: '60%' }} />
				</div>
			)}
		</>
	);

	const analyticsPanel = (
		<AnalyticsPanel
			isOpen={isAnalyticsOpen}
			onClose={(): void => setIsAnalyticsOpen(false)}
		/>
	);

	if (variant === SpanDetailVariant.DOCKED) {
		return (
			<>
				<div className="span-details-panel">{content}</div>
				{analyticsPanel}
			</>
		);
	}

	if (variant === SpanDetailVariant.DRAWER) {
		return (
			<>
				<DetailsPanelDrawer
					isOpen={panelState.isOpen}
					onClose={panelState.close}
					className="span-details-panel"
				>
					{content}
				</DetailsPanelDrawer>
				{analyticsPanel}
			</>
		);
	}

	return (
		<>
			<FloatingPanel
				isOpen={panelState.isOpen}
				className="span-details-panel"
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
			{analyticsPanel}
		</>
	);
}

export default SpanDetailsPanel;
