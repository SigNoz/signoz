import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
	TabsContent,
	TabsList,
	TabsRoot,
	TabsTrigger,
} from '@signozhq/ui/tabs';
import { DetailsHeader } from 'components/DetailsPanel';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useGetTraceAggregations from 'hooks/trace/useGetTraceAggregations';
import { generateColorPair } from 'pages/TraceDetailsV3/utils/generateColorPair';
import { FloatingPanel } from 'periscope/components/FloatingPanel';
import {
	SpantypesSpanAggregationDTO,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { TraceDetailV3URLProps } from 'types/api/trace/getTraceV3';

import { useTraceStore } from '../../stores/traceStore';
import {
	AGGREGATIONS,
	getAggregationMap as findAggregationMap,
} from '../../utils/aggregations';
import AnalyticsTabContent, { AnalyticsRow } from './AnalyticsTabContent';

import styles from './AnalyticsPanel.module.scss';

interface AnalyticsPanelProps {
	isOpen: boolean;
	onClose: () => void;
	onTabChange: (tab: string) => void;
}

const PANEL_WIDTH = 350;
const PANEL_MARGIN_RIGHT = 100;
const PANEL_MARGIN_TOP = 50;
const PANEL_MARGIN_BOTTOM = 50;

function AnalyticsPanel({
	isOpen,
	onClose,
	onTabChange,
}: AnalyticsPanelProps): JSX.Element | null {
	const { id: traceId } = useParams<TraceDetailV3URLProps>();
	const colorByField = useTraceStore((s) => s.colorByField);
	const colorByFieldName = colorByField.name;
	const isDarkMode = useIsDarkMode();

	// Fetch exec-time % + span count for the current color-by field only, and
	// only while the panel is open. Changing the field refetches via the key.
	const aggregationsRequest = useMemo<SpantypesSpanAggregationDTO[]>(() => {
		// v5 TelemetryFieldKey and the generated DTO are runtime-identical; only
		// the literal-union vs enum nominal types differ
		const field = colorByField as unknown as TelemetrytypesTelemetryFieldKeyDTO;
		return [
			{ field, aggregation: AGGREGATIONS.EXEC_TIME_PCT },
			{ field, aggregation: AGGREGATIONS.SPAN_COUNT },
		];
	}, [colorByField]);

	const { data, isLoading, isError } = useGetTraceAggregations({
		traceId: traceId || '',
		aggregations: aggregationsRequest,
		enabled: isOpen,
	});

	const aggregations = data?.data.aggregations;

	const execTimePct = useMemo(
		() =>
			findAggregationMap(
				aggregations,
				AGGREGATIONS.EXEC_TIME_PCT,
				colorByFieldName,
			),
		[aggregations, colorByFieldName],
	);

	const spanCounts = useMemo(
		() =>
			findAggregationMap(aggregations, AGGREGATIONS.SPAN_COUNT, colorByFieldName),
		[aggregations, colorByFieldName],
	);

	const execTimeRows = useMemo<AnalyticsRow[]>(() => {
		if (!execTimePct) {
			return [];
		}
		return Object.entries(execTimePct)
			.sort(([, a], [, b]) => b - a)
			.map(([group, percentage]) => {
				const pair = generateColorPair(group);
				return {
					group,
					color: isDarkMode ? pair.color : pair.colorDark,
					widthPct: Math.min(percentage, 100),
					label: `${percentage.toFixed(2)}%`,
				};
			});
	}, [execTimePct, isDarkMode]);

	const spanCountRows = useMemo<AnalyticsRow[]>(() => {
		if (!spanCounts) {
			return [];
		}
		const max = Math.max(...Object.values(spanCounts), 1);
		return Object.entries(spanCounts)
			.sort(([, a], [, b]) => b - a)
			.map(([group, count]) => {
				const pair = generateColorPair(group);
				return {
					group,
					color: isDarkMode ? pair.color : pair.colorDark,
					widthPct: (count / max) * 100,
					label: String(count),
				};
			});
	}, [spanCounts, isDarkMode]);

	if (!isOpen) {
		return null;
	}

	return (
		<FloatingPanel
			isOpen
			width={PANEL_WIDTH}
			height={window.innerHeight - PANEL_MARGIN_TOP - PANEL_MARGIN_BOTTOM}
			defaultPosition={{
				x: window.innerWidth - PANEL_WIDTH - PANEL_MARGIN_RIGHT,
				y: PANEL_MARGIN_TOP,
			}}
			enableResizing={{
				top: true,
				bottom: true,
				left: false,
				right: false,
				topLeft: false,
				topRight: false,
				bottomLeft: false,
				bottomRight: false,
			}}
		>
			<DetailsHeader
				title="Analytics"
				onClose={onClose}
				className="floating-panel__drag-handle"
			/>

			<div className={styles.body}>
				<TabsRoot defaultValue="exec-time" onValueChange={onTabChange}>
					<TabsList variant="secondary">
						<TabsTrigger value="exec-time" variant="secondary">
							% exec time
						</TabsTrigger>
						<TabsTrigger value="spans" variant="secondary">
							Spans
						</TabsTrigger>
					</TabsList>

					<div className={styles.tabsScroll}>
						<TabsContent value="exec-time">
							<AnalyticsTabContent
								isLoading={isLoading}
								isError={isError}
								fieldName={colorByFieldName}
								rows={execTimeRows}
								valueVariant="wide"
							/>
						</TabsContent>

						<TabsContent value="spans">
							<AnalyticsTabContent
								isLoading={isLoading}
								isError={isError}
								fieldName={colorByFieldName}
								rows={spanCountRows}
								valueVariant="narrow"
							/>
						</TabsContent>
					</div>
				</TabsRoot>
			</div>
		</FloatingPanel>
	);
}

export default AnalyticsPanel;
